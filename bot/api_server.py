"""
BlazeOrder / DORA — Flask API Server v2
Full Google Sheets sync: orders, products, inventory, status updates.
Run: python3 api_server.py
Port: http://localhost:5001
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from google.oauth2.service_account import Credentials
import gspread
from datetime import datetime
import logging
import json

# ── CONFIG ────────────────────────────────────────────────────────────────────
import os

SPREADSHEET_NAME = "BlazeOrder Database"

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

# ── SHEETS CONNECTION ─────────────────────────────────────────────────────────
def get_gc():
    scope = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive"
    ]
    # Railway: credentials stored as environment variable GOOGLE_CREDENTIALS_JSON
    creds_json = os.environ.get("GOOGLE_CREDENTIALS_JSON")
    if creds_json:
        import json as _json
        from google.oauth2.service_account import Credentials as _Creds
        info = _json.loads(creds_json)
        creds = _Creds.from_service_account_info(info, scopes=scope)
    else:
        # Local development: use file path
        local_path = os.environ.get(
            "CREDENTIALS_FILE",
            "/Users/aa.sobirjonov/Desktop/blazeorder_bot/credentials.json"
        )
        creds = Credentials.from_service_account_file(local_path, scopes=scope)
    return gspread.authorize(creds)

def get_sheet(tab_name):
    return get_gc().open(SPREADSHEET_NAME).worksheet(tab_name)

def col_index(headers, name, fallback=None):
    """Return 1-based column index for header name, or fallback."""
    try:
        return headers.index(name) + 1
    except ValueError:
        return fallback

# ── HEALTH ────────────────────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"success": True, "message": "BlazeOrder API v2", "time": datetime.now().isoformat()})

# ── SUPPLIERS (for CreateOrder screen) ───────────────────────────────────────
@app.route("/api/suppliers", methods=["GET"])
def get_suppliers():
    try:
        rows = get_sheet("Suppliers").get_all_records()
        seen = {}
        for row in rows:
            name = str(row.get("supplier", "")).strip()
            if not name:
                continue
            if name not in seen:
                seen[name] = {
                    "id":               name,
                    "name":             name,
                    "categories":       set(),
                    "category":         str(row.get("category", "Other")).strip().capitalize(),
                    "group_chat_id":    str(row.get("group_chat_id", "")).strip(),
                    "rating":           4.8,
                    "image":            f"https://picsum.photos/seed/{name.replace(' ','')}/200/200",
                    "deliveryTime":     "30-45 min",
                    "isOpen":           True,
                    "successRate":      99.0,
                    "isVerified":       True,
                    "complianceStatus": "verified",
                    "workingHours":     [],
                    "deliveryZones":    [],
                    "capacityLimit":    100,
                    "currentOrderCount":0,
                }
            seen[name]["categories"].add(str(row.get("category", "")).strip().capitalize())

        result = []
        for s in seen.values():
            s["categories"] = list(s["categories"])
            if s["categories"]:
                s["category"] = s["categories"][0]
            result.append(s)

        return jsonify({"success": True, "data": result})
    except Exception as e:
        logging.error(f"GET /api/suppliers: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ── PRODUCTS (for ProductList + ProductManagement screens) ───────────────────
@app.route("/api/products", methods=["GET"])
def get_products():
    try:
        rows = get_sheet("Suppliers").get_all_records()
        products = []
        for row in rows:
            pid  = str(row.get("product_id", "")).strip()
            name = str(row.get("name", "")).strip()
            if not pid or not name:
                continue

            # stock_level column — falls back to 100 if column doesn't exist yet
            stock = row.get("stock_level", 100)
            try:
                stock = int(stock)
            except (ValueError, TypeError):
                stock = 100

            low_alert = row.get("low_stock_alert", 10)
            try:
                low_alert = int(low_alert)
            except (ValueError, TypeError):
                low_alert = 10

            available = str(row.get("available", "YES")).strip().upper()

            products.append({
                "id":            pid,
                "name":          name,
                "price":         float(row.get("price", 0)),
                "unit":          str(row.get("unit", "")).strip(),
                "supplier":      str(row.get("supplier", "")).strip(),
                "supplierId":    str(row.get("supplier", "")).strip(),
                "category":      str(row.get("category", "")).strip().capitalize(),
                "available":     available == "YES",
                "isActive":      available == "YES",
                "description":   str(row.get("description", name)).strip(),
                "image":         f"https://picsum.photos/seed/{pid}/300/300",
                "stockLevel":    stock,
                "reservedStock": 0,
                "minOrderQty":   1,
                "lowStockAlert": low_alert,
                "group_chat_id": str(row.get("group_chat_id", "")).strip(),
            })
        return jsonify({"success": True, "data": products})
    except Exception as e:
        logging.error(f"GET /api/products: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/products/<product_id>", methods=["PATCH"])
def update_product(product_id):
    """Update name, price, stock_level, available, description for a product."""
    try:
        body    = request.get_json()
        sheet   = get_sheet("Suppliers")
        headers = sheet.row_values(1)
        records = sheet.get_all_records()

        updated = False
        for i, row in enumerate(records, start=2):
            if str(row.get("product_id", "")).strip() != product_id:
                continue

            updatable = {
                "name":            body.get("name"),
                "price":           body.get("price"),
                "stock_level":     body.get("stockLevel"),
                "available":       ("YES" if body.get("isActive") else "NO") if "isActive" in body else None,
                "description":     body.get("description"),
                "low_stock_alert": body.get("lowStockAlert"),
            }

            for col_name, value in updatable.items():
                if value is None:
                    continue
                c = col_index(headers, col_name)
                if c:
                    sheet.update_cell(i, c, value)
                else:
                    # Column doesn't exist — add it to header row
                    new_col = len(headers) + 1
                    sheet.update_cell(1, new_col, col_name)
                    sheet.update_cell(i, new_col, value)
                    headers.append(col_name)

            updated = True
            logging.info(f"Product {product_id} updated: {body}")
            break

        if not updated:
            return jsonify({"success": False, "error": f"Product {product_id} not found"}), 404

        return jsonify({"success": True, "product_id": product_id})
    except Exception as e:
        logging.error(f"PATCH /api/products/{product_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/products", methods=["POST"])
def add_product():
    """Add a new product row to the Suppliers sheet."""
    try:
        body    = request.get_json()
        sheet   = get_sheet("Suppliers")
        headers = sheet.row_values(1)

        # Generate a product_id if not provided
        pid = body.get("product_id") or f"p{int(datetime.now().timestamp())}"

        # Build row in the same column order as headers
        field_map = {
            "product_id":     pid,
            "supplier":       body.get("supplier", ""),
            "category":       body.get("category", ""),
            "name":           body.get("name", ""),
            "price":          body.get("price", 0),
            "unit":           body.get("unit", ""),
            "available":      "YES" if body.get("isActive", True) else "NO",
            "group_chat_id":  body.get("group_chat_id", ""),
            "stock_level":    body.get("stockLevel", 100),
            "low_stock_alert":body.get("lowStockAlert", 10),
            "description":    body.get("description", ""),
        }

        # Add missing columns to header if needed
        for col_name in field_map:
            if col_name not in headers:
                sheet.update_cell(1, len(headers) + 1, col_name)
                headers.append(col_name)

        new_row = [field_map.get(h, "") for h in headers]
        sheet.append_row(new_row)
        logging.info(f"Product added: {pid} - {body.get('name')}")

        return jsonify({"success": True, "product_id": pid})
    except Exception as e:
        logging.error(f"POST /api/products: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ── ORDERS ────────────────────────────────────────────────────────────────────
@app.route("/api/orders", methods=["GET"])
def get_orders():
    try:
        supplier_filter = request.args.get("supplier", "").strip()
        rows = get_sheet("Orders").get_all_records()
        if supplier_filter:
            rows = [r for r in rows if str(r.get("supplier","")).strip().lower() == supplier_filter.lower()]
        orders = []
        for row in rows:
            oid = str(row.get("order_id", "")).strip()
            if not oid:
                continue

            # Parse items_json if present, else build from legacy columns
            items_raw = str(row.get("items_json", "")).strip()
            if items_raw:
                try:
                    items = json.loads(items_raw)
                except Exception:
                    items = []
            else:
                # Legacy single-item format
                prod_name = str(row.get("items", row.get("product", ""))).strip()
                qty_raw   = row.get("quantity", 1)
                try:
                    qty = int(qty_raw)
                except (ValueError, TypeError):
                    qty = 1
                price_raw = row.get("total_price", 0)
                try:
                    price = float(price_raw) / max(qty, 1)
                except (ValueError, TypeError):
                    price = 0
                items = [{"id": oid, "name": prod_name, "price": price, "quantity": qty, "category": ""}] if prod_name else []

            status = str(row.get("status", "New")).strip()

            orders.append({
                "id":            oid,
                "date":          str(row.get("timestamp", "")).strip(),
                "status":        status,
                "total":         float(row.get("total_price", 0)) if str(row.get("total_price","")).replace(".","").isdigit() else 0,
                "supplierName":  str(row.get("supplier", "")).strip(),
                "buyerName":     str(row.get("client_name", "")).strip(),
                "clientChatId":  str(row.get("client_chat_id", "")).strip(),
                "address":       str(row.get("address", "")).strip(),
                "deliverySlot":  str(row.get("delivery_slot", "")).strip(),
                "latitude":      str(row.get("latitude", "")).strip(),
                "longitude":     str(row.get("longitude", "")).strip(),
                "paymentMethod": str(row.get("payment_method", "balance")).strip(),
                "declineReason": str(row.get("decline_reason", "")).strip(),
                "driverName":    str(row.get("driver_name", "")).strip(),
                "items":         items,
                "timeline": [
                    {"status": "Order Placed", "time": str(row.get("timestamp", "")), "completed": True, "author": "Buyer"}
                ],
            })
        return jsonify({"success": True, "data": orders})
    except Exception as e:
        logging.error(f"GET /api/orders: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/orders", methods=["POST"])
def create_order():
    """
    Called when buyer clicks Pay Balance / Pay on Credit.
    Writes a new row to the Orders sheet.
    Also triggers Telegram bot supplier notification via shared sheet.
    """
    try:
        body = request.get_json()
        sheet   = get_sheet("Orders")
        headers = sheet.row_values(1)

        order_id       = body.get("id", f"ORD-{int(datetime.now().timestamp())}")
        timestamp      = body.get("date", datetime.now().isoformat())
        client_name    = body.get("buyerName", "")
        client_chat_id = body.get("clientChatId", "")
        supplier       = body.get("supplierName", "")
        total          = body.get("total", 0)
        address        = body.get("address", "")
        payment_method = "credit" if body.get("isCreditPayment") else "balance"
        items          = body.get("items", [])
        items_json     = json.dumps(items, ensure_ascii=False)

        # Legacy single-item columns for bot compatibility
        first_item     = items[0] if items else {}
        product_name   = first_item.get("name", "")
        quantity       = first_item.get("quantity", 1)

        field_map = {
            "order_id":       order_id,
            "timestamp":      timestamp,
            "client_name":    client_name,
            "client_chat_id": client_chat_id,
            "items":          product_name,          # legacy bot compat
            "product":        product_name,          # legacy bot compat
            "quantity":       quantity,               # legacy bot compat
            "total_price":    total,
            "status":         "New",
            "supplier":       supplier,
            "address":        address,
            "latitude":       body.get("latitude", ""),
            "longitude":      body.get("longitude", ""),
            "session_id":     body.get("sessionId", ""),
            "payment_method": payment_method,
            "items_json":     items_json,
            "decline_reason": "",
            "driver_name":    "",
        }

        # Add any missing columns to header
        for col_name in field_map:
            if col_name not in headers:
                sheet.update_cell(1, len(headers) + 1, col_name)
                headers.append(col_name)

        new_row = [field_map.get(h, "") for h in headers]
        sheet.append_row(new_row)
        logging.info(f"Order created: {order_id} for {supplier} total={total}")

        return jsonify({"success": True, "order_id": order_id})
    except Exception as e:
        logging.error(f"POST /api/orders: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/orders/<order_id>/status", methods=["PATCH"])
def update_order_status(order_id):
    try:
        body       = request.get_json()
        new_status = body.get("status", "").strip()
        driver     = body.get("driverName", "")
        reason     = body.get("reason", "")

        if not new_status:
            return jsonify({"success": False, "error": "status required"}), 400

        sheet   = get_sheet("Orders")
        headers = sheet.row_values(1)
        records = sheet.get_all_records()

        status_col = col_index(headers, "status", 8)
        driver_col = col_index(headers, "driver_name")
        reason_col = col_index(headers, "decline_reason")

        for i, row in enumerate(records, start=2):
            if str(row.get("order_id", "")).strip() != order_id:
                continue

            sheet.update_cell(i, status_col, new_status)

            if driver and driver_col:
                sheet.update_cell(i, driver_col, driver)

            if reason and reason_col:
                sheet.update_cell(i, reason_col, reason)

            logging.info(f"Order {order_id} → {new_status}")
            return jsonify({"success": True, "order_id": order_id, "status": new_status})

        return jsonify({"success": False, "error": f"Order {order_id} not found"}), 404
    except Exception as e:
        logging.error(f"PATCH /api/orders/{order_id}/status: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ── CLIENTS ───────────────────────────────────────────────────────────────────
@app.route("/api/clients", methods=["GET"])
def get_clients():
    try:
        rows = get_sheet("Clients").get_all_records()
        clients = []
        for row in rows:
            clients.append({
                "chat_id":     str(row.get("chat_id", "")).strip(),
                "name":        str(row.get("name", "")).strip(),
                "institution": str(row.get("institution", "")).strip(),
                "address":     str(row.get("address", "")).strip(),
                "phone":       str(row.get("phone", "")).strip(),
                "registered":  str(row.get("registered_date", "")).strip(),
                "latitude":    str(row.get("latitude", "")).strip(),
                "longitude":   str(row.get("longitude", "")).strip(),
            })
        return jsonify({"success": True, "data": clients})
    except Exception as e:
        logging.error(f"GET /api/clients: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ── STAFF (filtered by supplier_name) ─────────────────────────────────────────
@app.route("/api/staff", methods=["GET"])
def get_staff():
    supplier = request.args.get("supplier_name", "").strip()
    try:
        rows = get_sheet("Staff").get_all_records()
        if supplier:
            rows = [r for r in rows if str(r.get("supplier_name","")).strip().lower() == supplier.lower()]
        result = []
        for r in rows:
            result.append({
                "id":            str(r.get("staff_id","")).strip(),
                "name":          str(r.get("name","")).strip(),
                "role":          str(r.get("role","")).strip(),
                "status":        str(r.get("status","offline")).strip(),
                "lastActive":    str(r.get("last_active","")).strip(),
                "ordersHandled": int(r.get("orders_handled",0) or 0),
                "avgTime":       str(r.get("avg_time","N/A")).strip(),
                "telegramId":    str(r.get("telegram_id","")).strip(),
                "permissions":   str(r.get("permissions","")).strip(),
                "supplierName":  str(r.get("supplier_name","")).strip(),
            })
        return jsonify({"success": True, "data": result})
    except Exception as e:
        logging.error(f"GET /api/staff: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/staff", methods=["POST"])
def add_staff():
    try:
        body    = request.get_json()
        sheet   = get_sheet("Staff")
        headers = sheet.row_values(1)
        records = sheet.get_all_records()
        existing = [str(r.get("staff_id","")) for r in records]
        nums = [int(s.replace("u","")) for s in existing if s.startswith("u") and s[1:].isdigit()]
        new_id = f"u{max(nums)+1 if nums else 1}"
        field_map = {
            "staff_id":       new_id,
            "name":           body.get("name",""),
            "role":           body.get("role","fulfillment"),
            "status":         "offline",
            "last_active":    "",
            "orders_handled": 0,
            "avg_time":       "N/A",
            "telegram_id":    body.get("telegramId",""),
            "permissions":    body.get("permissions",""),
            "supplier_name":  body.get("supplierName",""),
        }
        for col in field_map:
            if col not in headers:
                sheet.update_cell(1, len(headers)+1, col)
                headers.append(col)
        sheet.append_row([field_map.get(h,"") for h in headers])
        logging.info(f"Staff added: {new_id} - {body.get('name')}")
        return jsonify({"success": True, "staff_id": new_id})
    except Exception as e:
        logging.error(f"POST /api/staff: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/staff/<staff_id>/status", methods=["PATCH"])
def update_staff_status(staff_id):
    try:
        body    = request.get_json()
        status  = body.get("status","offline")
        sheet   = get_sheet("Staff")
        headers = sheet.row_values(1)
        records = sheet.get_all_records()
        status_col = col_index(headers, "status")
        active_col = col_index(headers, "last_active")
        for i, row in enumerate(records, start=2):
            if str(row.get("staff_id","")).strip() == staff_id:
                if status_col: sheet.update_cell(i, status_col, status)
                if active_col and status == "active":
                    sheet.update_cell(i, active_col, datetime.now().strftime("%Y-%m-%d %H:%M"))
                return jsonify({"success": True})
        return jsonify({"success": False, "error": "Staff not found"}), 404
    except Exception as e:
        logging.error(f"PATCH /api/staff/{staff_id}/status: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/staff/<staff_id>", methods=["DELETE"])
def remove_staff(staff_id):
    try:
        sheet   = get_sheet("Staff")
        records = sheet.get_all_records()
        for i, row in enumerate(records, start=2):
            if str(row.get("staff_id","")).strip() == staff_id:
                sheet.delete_rows(i)
                return jsonify({"success": True})
        return jsonify({"success": False, "error": "Staff not found"}), 404
    except Exception as e:
        logging.error(f"DELETE /api/staff/{staff_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ── SUPPLIER STATS (for owner's supplier overview) ─────────────────────────────
@app.route("/api/suppliers/stats", methods=["GET"])
def get_supplier_stats():
    try:
        all_orders  = get_sheet("Orders").get_all_records()
        all_products= get_sheet("Suppliers").get_all_records()
        all_staff   = get_sheet("Staff").get_all_records()

        # Get distinct supplier names from products tab
        supplier_names = list(dict.fromkeys(
            str(r.get("supplier","")).strip() for r in all_products
            if str(r.get("supplier","")).strip()
        ))

        result = []
        for name in supplier_names:
            s_orders   = [r for r in all_orders   if str(r.get("supplier","")).strip().lower() == name.lower()]
            s_products = [r for r in all_products if str(r.get("supplier","")).strip().lower() == name.lower()]
            s_staff    = [r for r in all_staff    if str(r.get("supplier_name","")).strip().lower() == name.lower()]

            completed = [o for o in s_orders if str(o.get("status","")).lower() in ("completed","sent","delivered")]
            revenue   = sum(float(o.get("total_price",0) or 0) for o in completed)
            total     = len(s_orders)
            cancelled = len([o for o in s_orders if str(o.get("status","")).lower() == "cancelled"])
            fulfillment_rate = round((len(completed)/total*100) if total > 0 else 0, 1)

            # Low stock count
            low_stock = 0
            for p in s_products:
                try:
                    sl = int(p.get("stock_level",100) or 100)
                    la = int(p.get("low_stock_alert",10) or 10)
                    if sl <= la: low_stock += 1
                except: pass

            result.append({
                "name":             name,
                "totalOrders":      total,
                "completedOrders":  len(completed),
                "cancelledOrders":  cancelled,
                "fulfillmentRate":  fulfillment_rate,
                "revenue":          round(revenue, 2),
                "productCount":     len(s_products),
                "staffCount":       len(s_staff),
                "lowStockCount":    low_stock,
                "activeStaff":      len([s for s in s_staff if str(s.get("status","")).lower() == "active"]),
            })
        return jsonify({"success": True, "data": result})
    except Exception as e:
        logging.error(f"GET /api/suppliers/stats: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ── ACCOUNTS (supplier / owner login) ────────────────────────────────────────
@app.route("/api/accounts/login", methods=["POST"])
def account_login():
    try:
        body     = request.get_json()
        username = str(body.get("username", "")).strip().lower()
        password = str(body.get("password", "")).strip()

        if not username or not password:
            return jsonify({"success": False, "error": "username and password required"}), 400

        rows = get_sheet("Accounts").get_all_records()
        for row in rows:
            row_user = str(row.get("username", "")).strip().lower()
            row_pass = str(row.get("password", "")).strip()
            row_type = str(row.get("type", "")).strip().lower()
            row_stat = str(row.get("status", "active")).strip().lower()

            if row_user == username and row_pass == password:
                if row_stat != "active":
                    return jsonify({"success": False, "error": "Account is inactive"}), 403
                return jsonify({"success": True, "data": {
                    "account_id":   str(row.get("account_id", "")).strip(),
                    "type":         row_type,
                    "linked_name":  str(row.get("linked_name", "")).strip(),
                    "username":     row_user,
                    "status":       row_stat,
                }})

        return jsonify({"success": False, "error": "Invalid username or password"}), 401
    except Exception as e:
        logging.error(f"POST /api/accounts/login: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ── AUTH / CLIENT ENDPOINTS (add these to api_server.py) ─────────────────────

@app.route("/api/clients/lookup", methods=["GET"])
def lookup_client():
    """Look up client by chat_id (Telegram) or phone number (standalone web)."""
    chat_id = request.args.get("chat_id", "").strip()
    phone   = request.args.get("phone", "").strip()

    if not chat_id and not phone:
        return jsonify({"success": False, "error": "chat_id or phone required"}), 400

    try:
        rows = get_sheet("Clients").get_all_records()
        for row in rows:
            match = False
            if chat_id and str(row.get("chat_id", "")).strip() == chat_id:
                match = True
            if phone:
                stored = str(row.get("phone", "")).strip().replace(" ", "").replace("-", "")
                incoming = phone.strip().replace(" ", "").replace("-", "")
                if stored == incoming or stored.endswith(incoming) or incoming.endswith(stored):
                    match = True
            if match:
                return jsonify({"success": True, "data": {
                    "client_id":   str(row.get("client_id", "")).strip(),
                    "chat_id":     str(row.get("chat_id", "")).strip(),
                    "name":        str(row.get("name", "")).strip(),
                    "institution": str(row.get("institution", "")).strip(),
                    "address":     str(row.get("address", "")).strip(),
                    "phone":       str(row.get("phone", "")).strip(),
                    "registered":  str(row.get("registered_date", "")).strip(),
                    "latitude":    str(row.get("latitude", "")).strip(),
                    "longitude":   str(row.get("longitude", "")).strip(),
                }})
        return jsonify({"success": True, "data": None})  # not found
    except Exception as e:
        logging.error(f"GET /api/clients/lookup: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/clients/register", methods=["POST"])
def register_client():
    """Register a new client from the web app."""
    try:
        body = request.get_json()
        name        = body.get("name", "").strip()
        institution = body.get("institution", "").strip()
        phone       = body.get("phone", "").strip()
        address     = body.get("address", "").strip()
        chat_id     = body.get("chat_id", "").strip()  # empty for standalone web

        if not name or not phone:
            return jsonify({"success": False, "error": "name and phone are required"}), 400

        sheet   = get_sheet("Clients")
        headers = sheet.row_values(1)
        records = sheet.get_all_records()

        # Check not already registered
        for row in records:
            existing_phone = str(row.get("phone", "")).strip().replace(" ", "")
            incoming_phone = phone.replace(" ", "")
            if existing_phone == incoming_phone:
                return jsonify({"success": False, "error": "Phone already registered"}), 409

        # Generate client_id
        existing_ids = [str(r.get("client_id", "")) for r in records if r.get("client_id")]
        numbers = []
        for cid in existing_ids:
            try:
                numbers.append(int(cid.replace("CLIENT-", "")))
            except Exception:
                pass
        next_num   = max(numbers) + 1 if numbers else 1001
        client_id  = f"CLIENT-{next_num}"
        timestamp  = datetime.now().isoformat()

        field_map = {
            "client_id":       client_id,
            "chat_id":         chat_id,
            "name":            name,
            "institution":     institution,
            "address":         address,
            "phone":           phone,
            "registered_date": timestamp,
            "latitude":        str(body.get("latitude", "")),
            "longitude":       str(body.get("longitude", "")),
        }

        # Add missing header columns if needed
        for col_name in field_map:
            if col_name not in headers:
                sheet.update_cell(1, len(headers) + 1, col_name)
                headers.append(col_name)

        new_row = [field_map.get(h, "") for h in headers]
        sheet.append_row(new_row)
        logging.info(f"New client registered: {client_id} — {name} ({phone})")

        return jsonify({"success": True, "data": {
            "client_id": client_id, "chat_id": chat_id,
            "name": name, "institution": institution,
            "address": address, "phone": phone,
        }})
    except Exception as e:
        logging.error(f"POST /api/clients/register: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ── ENDPOINTS SUMMARY ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n✅  BlazeOrder API Server v2 — http://localhost:5001\n")
    print("   GET    /api/health")
    print("   GET    /api/suppliers")
    print("   GET    /api/products")
    print("   POST   /api/products          ← add new product to Sheets")
    print("   PATCH  /api/products/<id>     ← update stock/price/name")
    print("   GET    /api/orders")
    print("   POST   /api/orders            ← place order from webapp")
    print("   PATCH  /api/orders/<id>/status")
    print("   GET    /api/clients")
    print("   GET    /api/clients/lookup   <- by chat_id or phone")
    print("   POST   /api/clients/register <- new client from webapp\n")
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5001)), debug=False)
