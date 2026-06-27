import logging
import sqlite3
import json
from datetime import datetime, timedelta
import gspread
from google.oauth2.service_account import Credentials
from telegram import (
    Update, InlineKeyboardButton, InlineKeyboardMarkup,
    KeyboardButton, ReplyKeyboardMarkup, ReplyKeyboardRemove
)
from telegram.ext import (
    Application, CommandHandler, CallbackQueryHandler,
    MessageHandler, filters, ContextTypes, ConversationHandler
)

# ─── CONFIG ───────────────────────────────────────────────────────────────────
BOT_TOKEN        = "8697492982:AAHD2JVoLXW7HPgf0WQ3TaaOtcik0QA-u8w"
CREDENTIALS_FILE = "/Users/aa.sobirjonov/Desktop/blazeorder_bot/credentials.json"
SPREADSHEET_NAME = "BlazeOrder Database"
ADMIN_IDS        = [1398614118]

# ─── STATES ───────────────────────────────────────────────────────────────────
REG_INSTITUTION, REG_PHONE, REG_LOCATION = range(3)
WAITING_QUANTITY = 10

# ─── GOOGLE SHEETS ────────────────────────────────────────────────────────────
def get_gc():
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    creds = Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=scope)
    return gspread.authorize(creds)

def get_products_from_sheets():
    try:
        sheet = get_gc().open(SPREADSHEET_NAME).worksheet("Suppliers")
        products = {}
        for row in sheet.get_all_records():
            if str(row.get("available", "")).strip().upper() == "YES":
                pid = str(row["product_id"]).strip()
                products[pid] = {
                    "name":          str(row["name"]).strip(),
                    "price":         int(row["price"]),
                    "unit":          str(row["unit"]).strip(),
                    "supplier":      str(row["supplier"]).strip(),
                    "category":      str(row["category"]).strip().lower(),
                    "group_chat_id": str(row.get("group_chat_id", "")).strip(),
                }
        return products
    except Exception as e:
        logging.error(f"Failed to load products: {e}")
        return {}

def get_supplier_group_id(supplier_name):
    try:
        for row in get_gc().open(SPREADSHEET_NAME).worksheet("Suppliers").get_all_records():
            if str(row.get("supplier", "")).strip() == supplier_name:
                gid = str(row.get("group_chat_id", "")).strip()
                if gid:
                    return int(gid)
    except Exception as e:
        logging.error(f"Failed to get supplier group ID: {e}")
    return None

def generate_client_id():
    """Generate next CLIENT-XXXX id by reading existing ones from Sheets."""
    try:
        rows = get_gc().open(SPREADSHEET_NAME).worksheet("Clients").get_all_records()
        nums = []
        for r in rows:
            cid = str(r.get("client_id", "")).strip()
            if cid.startswith("CLIENT-") and cid[7:].isdigit():
                nums.append(int(cid[7:]))
        return f"CLIENT-{max(nums) + 1}" if nums else "CLIENT-1001"
    except Exception as e:
        logging.error(f"generate_client_id failed: {e}")
        return f"CLIENT-{int(datetime.now().timestamp()) % 9000 + 1000}"

def save_client_to_sheets(chat_id, name, institution, address, phone, lat, lon):
    """Save client to Sheets including client_id — synced with webapp."""
    try:
        sheet   = get_gc().open(SPREADSHEET_NAME).worksheet("Clients")
        headers = sheet.row_values(1)
        client_id = generate_client_id()
        # Build row matching headers exactly
        row_data = {
            "chat_id":     str(chat_id),
            "name":        name,
            "institution": institution,
            "address":     address,
            "phone":       phone,
            "registered":  datetime.now().strftime("%Y-%m-%d %H:%M"),
            "latitude":    str(lat),
            "longitude":   str(lon),
            "client_id":   client_id,
        }
        sheet.append_row([row_data.get(h, "") for h in headers])
        logging.info(f"Client saved: {client_id} — {name}")
        return client_id
    except Exception as e:
        logging.error(f"Failed to save client: {e}")
        return None

def save_order_to_sheets(order_id, session_id, timestamp, client_name, chat_id,
                         items_text, quantity, total_price, supplier,
                         address, lat, lon, payment_method, items_json_str):
    """
    Write one order row to Sheets — schema matches webapp exactly.
    Columns: order_id, date, client_name, chat_id, items, quantity,
             total_price, status, supplier, address, latitude, longitude,
             payment_method, decline_reason, driver_name, items_json, session_id
    """
    try:
        sheet   = get_gc().open(SPREADSHEET_NAME).worksheet("Orders")
        headers = sheet.row_values(1)
        row_data = {
            "order_id":       order_id,
            "date":           timestamp,
            "client_name":    client_name,
            "chat_id":        str(chat_id),
            "items":          items_text,
            "quantity":       str(quantity),
            "total_price":    str(total_price),
            "status":         "New",
            "supplier":       supplier,
            "address":        address,
            "latitude":       str(lat),
            "longitude":      str(lon),
            "payment_method": payment_method,
            "decline_reason": "",
            "driver_name":    "",
            "items_json":     items_json_str,
            "session_id":     session_id,
        }
        sheet.append_row([row_data.get(h, "") for h in headers])
    except Exception as e:
        logging.error(f"Failed to save order: {e}")

def update_order_status_in_sheets(order_id, new_status):
    try:
        sheet   = get_gc().open(SPREADSHEET_NAME).worksheet("Orders")
        records = sheet.get_all_records()
        headers = sheet.row_values(1)
        status_col = next((i+1 for i, h in enumerate(headers) if h == "status"), 8)
        for i, row in enumerate(records, start=2):
            if str(row.get("order_id", "")).strip() == order_id:
                sheet.update_cell(i, status_col, new_status)
                return
    except Exception as e:
        logging.error(f"Failed to update order status: {e}")

# ─── SQLITE ───────────────────────────────────────────────────────────────────
def init_db():
    conn = sqlite3.connect("blazeorder.db")
    c    = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS clients (
        chat_id INTEGER PRIMARY KEY, name TEXT, institution TEXT,
        address TEXT, phone TEXT, registered_date TEXT,
        latitude REAL, longitude REAL, client_id TEXT)""")
    c.execute("""CREATE TABLE IF NOT EXISTS orders (
        order_id TEXT PRIMARY KEY, timestamp TEXT, client_name TEXT,
        chat_id INTEGER, product TEXT, quantity INTEGER,
        unit_price INTEGER, total_price INTEGER, address TEXT,
        supplier TEXT, status TEXT DEFAULT 'New',
        latitude REAL, longitude REAL,
        session_id TEXT DEFAULT '',
        supplier_message_id INTEGER DEFAULT 0,
        items_json TEXT DEFAULT '',
        payment_method TEXT DEFAULT 'cash')""")
    # Safe column additions for existing DBs
    for col, defn in [
        ("session_id",           "TEXT DEFAULT ''"),
        ("supplier_message_id",  "INTEGER DEFAULT 0"),
        ("items_json",           "TEXT DEFAULT ''"),
        ("payment_method",       "TEXT DEFAULT 'cash'"),
        ("client_id",            "TEXT DEFAULT ''"),
    ]:
        try:
            c.execute(f"ALTER TABLE clients ADD COLUMN client_id TEXT DEFAULT ''")
        except sqlite3.OperationalError:
            pass
        try:
            c.execute(f"ALTER TABLE orders ADD COLUMN {col} {defn}")
        except sqlite3.OperationalError:
            pass
    conn.commit()
    conn.close()

def get_client(chat_id):
    conn = sqlite3.connect("blazeorder.db")
    c    = conn.cursor()
    c.execute("SELECT chat_id,name,institution,address,phone,latitude,longitude "
              "FROM clients WHERE chat_id=?", (chat_id,))
    row = c.fetchone()
    conn.close()
    if row:
        return dict(zip(["chat_id","name","institution","address","phone","latitude","longitude"], row))
    return None

def save_client_local(chat_id, name, institution, address, phone, lat, lon, client_id=""):
    conn = sqlite3.connect("blazeorder.db")
    conn.cursor().execute(
        "INSERT OR REPLACE INTO clients "
        "(chat_id,name,institution,address,phone,registered_date,latitude,longitude,client_id) "
        "VALUES (?,?,?,?,?,?,?,?,?)",
        (chat_id, name, institution, address, phone,
         datetime.now().strftime("%Y-%m-%d %H:%M"), lat, lon, client_id))
    conn.commit(); conn.close()

def save_order_local(order_id, chat_id, client_name, product, quantity,
                     unit_price, total_price, address, supplier,
                     lat, lon, session_id, items_json_str, payment_method="cash"):
    conn = sqlite3.connect("blazeorder.db")
    conn.cursor().execute(
        "INSERT OR REPLACE INTO orders "
        "(order_id,timestamp,client_name,chat_id,product,quantity,"
        "unit_price,total_price,address,supplier,status,"
        "latitude,longitude,session_id,supplier_message_id,items_json,payment_method) "
        "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (order_id, datetime.now().strftime("%Y-%m-%d %H:%M"),
         client_name, chat_id, product, quantity,
         unit_price, total_price, address, supplier, "New",
         lat, lon, session_id, 0, items_json_str, payment_method))
    conn.commit(); conn.close()

def update_order_status_local(order_id, status):
    conn = sqlite3.connect("blazeorder.db")
    conn.cursor().execute("UPDATE orders SET status=? WHERE order_id=?", (status, order_id))
    conn.commit(); conn.close()

def set_supplier_message_id(order_id, msg_id):
    conn = sqlite3.connect("blazeorder.db")
    conn.cursor().execute("UPDATE orders SET supplier_message_id=? WHERE order_id=?", (msg_id, order_id))
    conn.commit(); conn.close()

def get_order(order_id):
    conn = sqlite3.connect("blazeorder.db")
    c    = conn.cursor()
    c.execute("SELECT order_id,timestamp,client_name,chat_id,product,quantity,"
              "unit_price,total_price,address,supplier,status,"
              "latitude,longitude,session_id,supplier_message_id,items_json,payment_method "
              "FROM orders WHERE order_id=?", (order_id,))
    row = c.fetchone()
    conn.close()
    if row:
        keys = ["order_id","timestamp","client_name","chat_id","product","quantity",
                "unit_price","total_price","address","supplier","status",
                "latitude","longitude","session_id","supplier_message_id","items_json","payment_method"]
        return dict(zip(keys, row))
    return None

def get_orders_local(chat_id):
    conn = sqlite3.connect("blazeorder.db")
    c    = conn.cursor()
    c.execute("SELECT order_id,timestamp,product,quantity,total_price,status,session_id "
              "FROM orders WHERE chat_id=? ORDER BY timestamp DESC LIMIT 10", (chat_id,))
    rows = c.fetchall()
    conn.close()
    return rows

def get_admin_stats():
    conn     = sqlite3.connect("blazeorder.db")
    c        = conn.cursor()
    today    = datetime.now().strftime("%Y-%m-%d")
    week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    c.execute("SELECT COUNT(*), SUM(total_price) FROM orders WHERE timestamp LIKE ?", (f"{today}%",))
    today_count, today_rev = c.fetchone()
    c.execute("SELECT COUNT(*), SUM(total_price) FROM orders WHERE timestamp >= ?", (week_ago,))
    week_count, week_rev = c.fetchone()
    c.execute("SELECT supplier, COUNT(*), SUM(total_price) FROM orders GROUP BY supplier ORDER BY COUNT(*) DESC")
    by_supplier = c.fetchall()
    c.execute("SELECT product, COUNT(*) cnt FROM orders GROUP BY product ORDER BY cnt DESC LIMIT 5")
    top_products = c.fetchall()
    c.execute("SELECT COUNT(*) FROM clients")
    total_clients = c.fetchone()[0]
    c.execute("SELECT name,institution,phone,registered_date FROM clients ORDER BY registered_date DESC LIMIT 20")
    clients = c.fetchall()
    conn.close()
    return {"today_count": today_count or 0, "today_rev": today_rev or 0,
            "week_count": week_count or 0,   "week_rev": week_rev or 0,
            "by_supplier": by_supplier,       "top_products": top_products,
            "total_clients": total_clients,   "clients": clients}

# ─── KEYBOARDS ────────────────────────────────────────────────────────────────
def main_menu_keyboard():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("📦 Browse Catalog", callback_data="menu_catalog")],
        [InlineKeyboardButton("🛒 My Cart",         callback_data="menu_cart")],
        [InlineKeyboardButton("📋 My Orders",       callback_data="menu_orders")],
        [InlineKeyboardButton("💬 Support",          callback_data="menu_support")],
    ])

def phone_request_keyboard():
    return ReplyKeyboardMarkup(
        [[KeyboardButton("📱 Share My Phone Number", request_contact=True)]],
        resize_keyboard=True, one_time_keyboard=True)

def location_request_keyboard():
    return ReplyKeyboardMarkup(
        [[KeyboardButton("📍 Share My Location", request_location=True)]],
        resize_keyboard=True, one_time_keyboard=True)

def catalog_keyboard(products):
    seen  = set()
    icons = {"noodles":"🍜","drinks":"🥤","cleaning":"🧴","snacks":"🍿","dairy":"🥛","other":"📦"}
    buttons = []
    for p in products.values():
        cat = p["category"]
        if cat not in seen:
            buttons.append([InlineKeyboardButton(
                f"{icons.get(cat,'📦')} {cat.capitalize()}", callback_data=f"cat_{cat}")])
            seen.add(cat)
    buttons.append([InlineKeyboardButton("⬅️ Back", callback_data="back_main")])
    return InlineKeyboardMarkup(buttons)

def category_keyboard(products, category):
    buttons = [[InlineKeyboardButton(
                    f"{p['name']} — {p['price']:,} UZS / {p['unit']}",
                    callback_data=f"prod_{pid}")]
               for pid, p in products.items() if p["category"] == category]
    buttons.append([InlineKeyboardButton("⬅️ Back to Catalog", callback_data="menu_catalog")])
    return InlineKeyboardMarkup(buttons)

def product_keyboard(prod_id, category):
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("➕ Add to Cart", callback_data=f"addcart_{prod_id}")],
        [InlineKeyboardButton("⬅️ Back",        callback_data=f"cat_{category}")],
    ])

def cart_keyboard():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("✅ Checkout",       callback_data="cart_checkout")],
        [InlineKeyboardButton("🗑 Clear Cart",     callback_data="cart_clear")],
        [InlineKeyboardButton("📦 Keep Shopping",  callback_data="menu_catalog")],
    ])

def supplier_order_keyboard(order_id: str, status: str):
    """
    Matches webapp status flow:
    New → Accepted → Preparing → Ready → Sent
    """
    if status == "New":
        return InlineKeyboardMarkup([[
            InlineKeyboardButton("✅ Accept", callback_data=f"sup_accept_{order_id}"),
            InlineKeyboardButton("❌ Decline", callback_data=f"sup_decline_{order_id}"),
        ]])
    elif status == "Accepted":
        return InlineKeyboardMarkup([[
            InlineKeyboardButton("🔧 Start Preparing", callback_data=f"sup_preparing_{order_id}")
        ]])
    elif status == "Preparing":
        return InlineKeyboardMarkup([[
            InlineKeyboardButton("✔️ Mark Ready", callback_data=f"sup_ready_{order_id}")
        ]])
    elif status == "Ready":
        return InlineKeyboardMarkup([[
            InlineKeyboardButton("🚚 Mark as Sent", callback_data=f"sup_sent_{order_id}")
        ]])
    return InlineKeyboardMarkup([[
        InlineKeyboardButton(f"✔️ {status}", callback_data="noop")
    ]])

# ─── CART HELPERS ─────────────────────────────────────────────────────────────
def get_cart(context) -> dict:
    return context.user_data.setdefault("cart", {})

def cart_summary_text(cart: dict, products: dict) -> str:
    if not cart:
        return "🛒 Your cart is empty."
    lines = ["🛒 *Your Cart:*\n"]
    total = 0
    for pid, qty in cart.items():
        p = products.get(pid)
        if not p:
            continue
        sub = p["price"] * qty
        total += sub
        lines.append(f"• {p['name']} × {qty} {p['unit']} = {sub:,} UZS")
    lines.append(f"\n💰 *Total: {total:,} UZS*")
    return "\n".join(lines)

# ─── REGISTRATION ─────────────────────────────────────────────────────────────
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user   = update.effective_user
    client = get_client(user.id)
    if client:
        await update.message.reply_text(
            f"👋 Welcome back, *{client['name']}*!\n🏢 {client['institution']}\n\nReady to order?",
            parse_mode="Markdown", reply_markup=main_menu_keyboard())
        return ConversationHandler.END
    context.user_data.update({"name": user.first_name, "chat_id": user.id,
                               "username": user.username or "", "cart": {}})
    await update.message.reply_text(
        f"👋 Hello, *{user.first_name}!* Welcome to *BlazeOrder*.\n\n"
        f"Fast delivery to your institution. 🚀\n\n"
        f"1️⃣ What is your *institution or business name*?\n_(e.g. Cyber Club Galaxy, Hotel Sharq)_",
        parse_mode="Markdown")
    return REG_INSTITUTION

async def reg_institution(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["institution"] = update.message.text.strip()
    await update.message.reply_text(
        f"🏢 *{context.user_data['institution']}* — got it!\n\n2️⃣ Share your *phone number*:",
        parse_mode="Markdown", reply_markup=phone_request_keyboard())
    return REG_PHONE

async def reg_phone(update: Update, context: ContextTypes.DEFAULT_TYPE):
    phone = update.message.contact.phone_number if update.message.contact else update.message.text.strip()
    context.user_data["phone"] = phone
    await update.message.reply_text(
        f"📱 *{phone}* — saved!\n\n3️⃣ Share your *delivery location*:",
        parse_mode="Markdown", reply_markup=location_request_keyboard())
    return REG_LOCATION

async def reg_location(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message.location:
        lat  = update.message.location.latitude
        lon  = update.message.location.longitude
        addr = f"{lat:.6f}, {lon:.6f}"
    else:
        addr = update.message.text.strip()
        lat = lon = 0.0
    d = context.user_data
    # Save to Sheets first to get client_id, then save locally
    client_id = save_client_to_sheets(d["chat_id"], d["name"], d["institution"], addr, d["phone"], lat, lon)
    save_client_local(d["chat_id"], d["name"], d["institution"], addr, d["phone"], lat, lon, client_id or "")
    await update.message.reply_text(
        f"✅ *All set, {d['name']}!*\n\n"
        f"🏢 {d['institution']}\n📱 {d['phone']}\n📍 Location saved\n"
        f"🆔 {client_id or 'Assigned'}\n\nStart ordering! 👇",
        parse_mode="Markdown", reply_markup=ReplyKeyboardRemove())
    context.user_data["cart"] = {}
    await update.message.reply_text("Choose an option:", reply_markup=main_menu_keyboard())
    return ConversationHandler.END

# ─── ADD-TO-CART CONVERSATION ─────────────────────────────────────────────────
async def addcart_entry(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query    = update.callback_query
    await query.answer()
    pid      = query.data[8:]
    products = get_products_from_sheets()
    if pid not in products:
        await query.answer("Product no longer available.", show_alert=True)
        return ConversationHandler.END
    p = products[pid]
    context.user_data["pending_pid"]      = pid
    context.user_data["product_snapshot"] = p
    await query.edit_message_text(
        f"➕ *Adding: {p['name']}*\n💰 {p['price']:,} UZS / {p['unit']}\n\n"
        f"How many *{p['unit']}s* do you want?\nType a number — e.g. `20`",
        parse_mode="Markdown")
    return WAITING_QUANTITY

async def get_quantity(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    if not text.isdigit() or int(text) <= 0:
        await update.message.reply_text("⚠️ Please send a valid number, e.g. `20`", parse_mode="Markdown")
        return WAITING_QUANTITY
    qty      = int(text)
    pid      = context.user_data.get("pending_pid")
    p        = context.user_data.get("product_snapshot")
    cart     = get_cart(context)
    cart[pid] = cart.get(pid, 0) + qty
    products  = get_products_from_sheets()
    await update.message.reply_text(
        f"✅ *{p['name']} × {qty}* added to cart!\n\n"
        f"{cart_summary_text(cart, products)}\n\nWhat's next?",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("📦 Keep Shopping", callback_data="menu_catalog")],
            [InlineKeyboardButton("🛒 View Cart",      callback_data="menu_cart")],
        ]))
    return ConversationHandler.END

# ─── CHECKOUT ─────────────────────────────────────────────────────────────────
async def checkout_entry(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    cart  = get_cart(context)
    if not cart:
        await query.answer("Your cart is empty!", show_alert=True)
        return ConversationHandler.END
    await finalize_cart_order(query, context)
    return ConversationHandler.END

async def finalize_cart_order(query, context: ContextTypes.DEFAULT_TYPE):
    user      = query.from_user
    cart      = get_cart(context)
    products  = get_products_from_sheets()
    client    = get_client(user.id)
    session_id = f"SESS-{int(datetime.now().timestamp())}"

    if not client:
        await query.edit_message_text("⚠️ Please register first with /start.")
        return

    address     = client["address"]
    lat         = client["latitude"]
    lon         = client["longitude"]
    phone       = client["phone"]
    institution = client["institution"]
    timestamp   = datetime.now().strftime("%Y-%m-%d %H:%M")

    # Group cart by supplier
    by_supplier: dict = {}
    for pid, qty in cart.items():
        p = products.get(pid)
        if p:
            by_supplier.setdefault(p["supplier"], []).append((pid, p, qty))

    confirmed_lines = []

    for supplier, items in by_supplier.items():
        group_id = get_supplier_group_id(supplier)
        base_oid = datetime.now().strftime("BO%Y%m%d%H%M%S") + f"_{supplier[:3].upper()}"

        # Build items_json for this supplier's order (matches webapp format)
        items_json = [
            {"id": pid, "name": p["name"], "price": p["price"], "quantity": qty}
            for pid, p, qty in items
        ]
        items_json_str  = json.dumps(items_json)
        items_text      = ", ".join(f"{p['name']} x{qty}" for _, p, qty in items)
        supplier_total  = sum(p["price"] * qty for _, p, qty in items)
        total_qty       = sum(qty for _, _, qty in items)
        order_id        = f"{base_oid}"

        # Save to Sheets and SQLite
        save_order_to_sheets(
            order_id, session_id, timestamp, user.first_name, user.id,
            items_text, total_qty, supplier_total, supplier,
            address, lat, lon, "cash", items_json_str
        )
        save_order_local(
            order_id, user.id, user.first_name,
            items_text, total_qty, 0, supplier_total,
            address, supplier, lat, lon, session_id, items_json_str, "cash"
        )

        confirmed_lines.append(
            f"• {items_text}\n  🏭 {supplier} | 💰 {supplier_total:,} UZS | 🆕 New"
        )

        # Notify supplier group
        if group_id:
            try:
                order_text = (
                    f"🆕 *NEW ORDER — {order_id}*\n\n"
                    f"👤 {user.first_name}"
                    f"{' (@' + user.username + ')' if user.username else ''}\n"
                    f"🏢 {institution}\n\n"
                    f"📦 *Items:*\n"
                )
                for _, p, qty in items:
                    order_text += f"  • {p['name']} ×{qty} {p['unit']} — {p['price']*qty:,} UZS\n"
                order_text += (
                    f"\n💰 *Total: {supplier_total:,} UZS*\n"
                    f"📍 {address}\n"
                    f"⏱ {timestamp}\n\n"
                    f"Status: 🆕 *New*"
                )
                sent = await context.bot.send_message(
                    chat_id=group_id,
                    text=order_text,
                    parse_mode="Markdown",
                    reply_markup=supplier_order_keyboard(order_id, "New")
                )
                set_supplier_message_id(order_id, sent.message_id)

                # Send location + contact once per supplier
                if lat and lon and lat != 0.0:
                    await context.bot.send_location(chat_id=group_id, latitude=lat, longitude=lon)
                if phone:
                    await context.bot.send_contact(
                        chat_id=group_id,
                        phone_number=phone.replace(" ", "").replace("-", ""),
                        first_name=user.first_name, last_name=institution)
            except Exception as e:
                logging.error(f"Failed to notify supplier {supplier}: {e}")

    grand_total = sum(products[pid]["price"] * qty
                      for pid, qty in cart.items() if pid in products)

    await query.edit_message_text(
        f"✅ *Order Confirmed!*\n\n"
        f"🆔 Session: `{session_id}`\n\n"
        + "\n".join(confirmed_lines) +
        f"\n\n💰 *Grand Total: {grand_total:,} UZS*\n"
        f"📍 {address}\n\n"
        f"You'll be notified when each order is accepted & dispatched.",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("🏠 Back to Menu", callback_data="back_main")]
        ]))
    context.user_data["cart"] = {}

# ─── BUTTON HANDLER ───────────────────────────────────────────────────────────
async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data  = query.data

    if data in ("menu_catalog", "back_catalog"):
        products = get_products_from_sheets()
        if not products:
            await query.edit_message_text("⚠️ Catalog unavailable. Try again shortly.",
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("⬅️ Back", callback_data="back_main")]]))
            return
        await query.edit_message_text("📦 *Product Catalog*\n\nChoose a category:",
            parse_mode="Markdown", reply_markup=catalog_keyboard(products))

    elif data == "back_main":
        client = get_client(query.from_user.id)
        name   = client["name"] if client else query.from_user.first_name
        inst   = client["institution"] if client else ""
        await query.edit_message_text(
            f"👋 Welcome back, *{name}*!\n🏢 {inst}\n\nWhat would you like to do?",
            parse_mode="Markdown", reply_markup=main_menu_keyboard())

    elif data.startswith("cat_"):
        category = data[4:]
        products = get_products_from_sheets()
        icons    = {"noodles":"🍜","drinks":"🥤","cleaning":"🧴","snacks":"🍿","dairy":"🥛","other":"📦"}
        await query.edit_message_text(
            f"{icons.get(category,'📦')} *{category.capitalize()}*\n\nChoose a product:",
            parse_mode="Markdown", reply_markup=category_keyboard(products, category))

    elif data.startswith("prod_"):
        pid      = data[5:]
        products = get_products_from_sheets()
        if pid not in products:
            await query.answer("Product no longer available.", show_alert=True); return
        p    = products[pid]
        cart = get_cart(context)
        await query.edit_message_text(
            f"*{p['name']}*\n\n💰 {p['price']:,} UZS / {p['unit']}\n"
            f"🏭 {p['supplier']}\n✅ In stock\n\nIn cart: *{cart.get(pid, 0)} {p['unit']}s*",
            parse_mode="Markdown", reply_markup=product_keyboard(pid, p["category"]))

    elif data == "menu_cart":
        cart     = get_cart(context)
        products = get_products_from_sheets()
        text     = cart_summary_text(cart, products)
        kb = cart_keyboard() if cart else InlineKeyboardMarkup([
            [InlineKeyboardButton("📦 Browse Catalog", callback_data="menu_catalog")],
            [InlineKeyboardButton("⬅️ Back",            callback_data="back_main")],
        ])
        await query.edit_message_text(text, parse_mode="Markdown", reply_markup=kb)

    elif data == "cart_clear":
        context.user_data["cart"] = {}
        await query.edit_message_text("🗑 Cart cleared.", reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("📦 Browse Catalog", callback_data="menu_catalog")],
            [InlineKeyboardButton("⬅️ Back",            callback_data="back_main")],
        ]))

    elif data == "menu_orders":
        rows = get_orders_local(query.from_user.id)
        if not rows:
            text = "📋 *My Orders*\n\nNo orders yet."
        else:
            icons = {"New":"🆕","Accepted":"✅","Preparing":"🔧","Ready":"📦","Sent":"🚚","Delivered":"✔️","Completed":"✅","Cancelled":"❌"}
            text  = "📋 *My Recent Orders*\n\n"
            for r in rows:
                text += (f"🆔 `{r[0]}`\n📅 {r[1]}\n📦 {r[2]}\n"
                         f"💰 {r[4]:,} UZS\n{icons.get(r[5],'❔')} {r[5]}\n──────────\n")
        await query.edit_message_text(text, parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("⬅️ Back", callback_data="back_main")]]))

    elif data == "menu_support":
        await query.edit_message_text(
            "💬 *Support*\n\nContact us:\n📱 @YourUsername\n⏰ 9AM–8PM daily",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("⬅️ Back", callback_data="back_main")]]))

    # ── SUPPLIER STATUS BUTTONS ────────────────────────────────────────────────
    elif data.startswith("sup_accept_"):
        order_id = data[11:]
        order    = get_order(order_id)
        if not order:
            await query.answer("Order not found.", show_alert=True); return
        update_order_status_local(order_id, "Accepted")
        update_order_status_in_sheets(order_id, "Accepted")
        await query.edit_message_reply_markup(reply_markup=supplier_order_keyboard(order_id, "Accepted"))
        await query.answer("✅ Order accepted!")
        try:
            await context.bot.send_message(
                chat_id=order["chat_id"],
                text=(f"✅ *Order Accepted!*\n\n"
                      f"🆔 `{order_id}`\n"
                      f"📦 {order['product']}\n"
                      f"🏭 {order['supplier']}\n\n"
                      f"Your order is being prepared. We'll notify you when it's on the way."),
                parse_mode="Markdown")
        except Exception as e:
            logging.error(f"Notify client failed: {e}")

    elif data.startswith("sup_decline_"):
        order_id = data[12:]
        order    = get_order(order_id)
        if not order:
            await query.answer("Order not found.", show_alert=True); return
        update_order_status_local(order_id, "Cancelled")
        update_order_status_in_sheets(order_id, "Cancelled")
        await query.edit_message_reply_markup(reply_markup=InlineKeyboardMarkup([[
            InlineKeyboardButton("❌ Declined", callback_data="noop")
        ]]))
        await query.answer("❌ Order declined.")
        try:
            await context.bot.send_message(
                chat_id=order["chat_id"],
                text=(f"❌ *Order Declined*\n\n"
                      f"🆔 `{order_id}`\n"
                      f"🏭 {order['supplier']}\n\n"
                      f"Sorry, this order could not be fulfilled. Please contact support."),
                parse_mode="Markdown")
        except Exception as e:
            logging.error(f"Notify client failed: {e}")

    elif data.startswith("sup_preparing_"):
        order_id = data[14:]
        order    = get_order(order_id)
        if not order:
            await query.answer("Order not found.", show_alert=True); return
        update_order_status_local(order_id, "Preparing")
        update_order_status_in_sheets(order_id, "Preparing")
        await query.edit_message_reply_markup(reply_markup=supplier_order_keyboard(order_id, "Preparing"))
        await query.answer("🔧 Preparing started!")
        try:
            await context.bot.send_message(
                chat_id=order["chat_id"],
                text=(f"🔧 *Order Being Prepared!*\n\n"
                      f"🆔 `{order_id}`\n"
                      f"🏭 {order['supplier']}\n\n"
                      f"Your order is now being assembled."),
                parse_mode="Markdown")
        except Exception as e:
            logging.error(f"Notify client failed: {e}")

    elif data.startswith("sup_ready_"):
        order_id = data[10:]
        order    = get_order(order_id)
        if not order:
            await query.answer("Order not found.", show_alert=True); return
        update_order_status_local(order_id, "Ready")
        update_order_status_in_sheets(order_id, "Ready")
        await query.edit_message_reply_markup(reply_markup=supplier_order_keyboard(order_id, "Ready"))
        await query.answer("📦 Order is ready!")
        try:
            await context.bot.send_message(
                chat_id=order["chat_id"],
                text=(f"📦 *Order Ready!*\n\n"
                      f"🆔 `{order_id}`\n"
                      f"🏭 {order['supplier']}\n\n"
                      f"Your order is packed and ready for dispatch."),
                parse_mode="Markdown")
        except Exception as e:
            logging.error(f"Notify client failed: {e}")

    elif data.startswith("sup_sent_"):
        order_id = data[9:]
        order    = get_order(order_id)
        if not order:
            await query.answer("Order not found.", show_alert=True); return
        update_order_status_local(order_id, "Sent")
        update_order_status_in_sheets(order_id, "Sent")
        await query.edit_message_reply_markup(reply_markup=InlineKeyboardMarkup([[
            InlineKeyboardButton("✔️ Sent", callback_data="noop")
        ]]))
        await query.answer("🚚 Marked as sent!")
        try:
            await context.bot.send_message(
                chat_id=order["chat_id"],
                text=(f"🚚 *Order On The Way!*\n\n"
                      f"🆔 `{order_id}`\n"
                      f"📦 {order['product']}\n"
                      f"🏭 {order['supplier']}\n"
                      f"📍 {order['address']}\n\n"
                      f"Your order has been dispatched. See you soon!"),
                parse_mode="Markdown")
        except Exception as e:
            logging.error(f"Notify client failed: {e}")

    elif data == "noop":
        pass

# ─── ADMIN ────────────────────────────────────────────────────────────────────
def build_admin_text(s, suffix=""):
    text = (f"📊 *BlazeOrder Admin*{suffix}\n{'─'*26}\n\n"
            f"📅 *Today* — {s['today_count']} orders, {s['today_rev']:,} UZS\n"
            f"📆 *This Week* — {s['week_count']} orders, {s['week_rev']:,} UZS\n"
            f"👥 *Clients:* {s['total_clients']}\n\n"
            f"🏭 *By Supplier:*\n")
    for sup, cnt, rev in s["by_supplier"]:
        text += f"  • {sup}: {cnt} orders — {(rev or 0):,} UZS\n"
    text += "\n🔥 *Top Products:*\n"
    for prod, cnt in s["top_products"]:
        text += f"  • {prod}: {cnt}\n"
    text += "\n👤 *Recent Clients:*\n"
    for name, inst, phone, reg in s["clients"]:
        text += f"  • {name} | {inst} | {phone} | {reg}\n"
    return text

async def admin_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in ADMIN_IDS:
        await update.message.reply_text("⛔ Access denied."); return
    await update.message.reply_text(
        build_admin_text(get_admin_stats()), parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("🔄 Refresh", callback_data="admin_refresh")]]))

async def admin_refresh(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if query.from_user.id not in ADMIN_IDS:
        await query.answer("⛔ Access denied.", show_alert=True); return
    await query.answer()
    suffix = f" _(updated {datetime.now().strftime('%H:%M')})_"
    await query.edit_message_text(
        build_admin_text(get_admin_stats(), suffix), parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("🔄 Refresh", callback_data="admin_refresh")]]))

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data.clear()
    await update.message.reply_text("Cancelled. Use /start to return.",
                                    reply_markup=ReplyKeyboardRemove())
    return ConversationHandler.END

# ─── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    logging.basicConfig(level=logging.INFO)
    init_db()
    app = Application.builder().token(BOT_TOKEN).build()

    reg_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            REG_INSTITUTION: [MessageHandler(filters.TEXT & ~filters.COMMAND, reg_institution)],
            REG_PHONE: [
                MessageHandler(filters.CONTACT, reg_phone),
                MessageHandler(filters.TEXT & ~filters.COMMAND, reg_phone),
            ],
            REG_LOCATION: [
                MessageHandler(filters.LOCATION, reg_location),
                MessageHandler(filters.TEXT & ~filters.COMMAND, reg_location),
            ],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    addcart_handler = ConversationHandler(
        entry_points=[CallbackQueryHandler(addcart_entry, pattern="^addcart_")],
        states={
            WAITING_QUANTITY: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_quantity)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
        per_message=False,
    )

    checkout_handler = ConversationHandler(
        entry_points=[CallbackQueryHandler(checkout_entry, pattern="^cart_checkout$")],
        states={},
        fallbacks=[CommandHandler("cancel", cancel)],
        per_message=False,
    )

    app.add_handler(reg_handler)
    app.add_handler(addcart_handler)
    app.add_handler(checkout_handler)
    app.add_handler(CommandHandler("admin", admin_cmd))
    app.add_handler(CallbackQueryHandler(admin_refresh, pattern="^admin_refresh$"))
    app.add_handler(CallbackQueryHandler(button_handler))

    print("✅ BlazeOrder bot is running...")
    app.run_polling()

if __name__ == "__main__":
    main()
