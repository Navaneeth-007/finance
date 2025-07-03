from flask import Flask, request, jsonify, render_template, url_for
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, auth
import os
import json

# --- CONFIG ---
MONGO_URI = 'mongodb+srv://navaneeth007:navaneeth007@cluster0.yfkkdys.mongodb.net/?tlsAllowInvalidCertificates=true'
DB_NAME = 'finance_db'
EXPENSES_COLLECTION = 'expenses'
INCOMES_COLLECTION = 'incomes'
BUDGETS_COLLECTION = 'budgets'

# --- APP SETUP ---
app = Flask(__name__)

# --- CORS CONFIGURATION ---
CORS(
    app,
    origins=["http://127.0.0.1:5500", "http://localhost:5500"],
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)

# --- DB CONNECTION ---
def get_db():
    client = MongoClient(MONGO_URI)
    return client[DB_NAME]

def serialize_expense(exp):
    exp['_id'] = str(exp['_id'])
    if isinstance(exp['date'], datetime):
        exp['date'] = exp['date'].strftime('%Y-%m-%d')
    return exp

def serialize_txn(txn):
    txn['_id'] = str(txn['_id'])
    txn['user_id'] = str(txn['user_id'])
    txn['date'] = txn['date'].strftime('%Y-%m-%d') if isinstance(txn['date'], datetime) else txn['date']
    return txn

# --- FIREBASE ADMIN INITIALIZATION ---
if not firebase_admin._apps:
    if 'GOOGLE_APPLICATION_CREDENTIALS_JSON' in os.environ:
        service_account_info = json.loads(os.environ['GOOGLE_APPLICATION_CREDENTIALS_JSON'])
        cred = credentials.Certificate(service_account_info)
    else:
        cred = credentials.Certificate('serviceAccountKey.json')  # Local fallback
    firebase_admin.initialize_app(cred)

# --- API ENDPOINTS ---

@app.route('/api/expenses', methods=['POST'])
def add_expense():
    db = get_db()
    data = request.json
    required = ['uid', 'date', 'amount', 'description', 'category']
    for field in required:
        if field not in data:
            return jsonify({'error': f'Missing field: {field}'}), 400
    expense = {
        'uid': data['uid'],
        'date': data['date'],
        'amount': float(data['amount']),
        'description': data['description'],
        'category': data['category']
    }
    db[EXPENSES_COLLECTION].insert_one(expense)
    return jsonify({'status': 'success'})

@app.route('/api/expenses/<uid>', methods=['GET'])
def get_expenses(uid):
    db = get_db()
    month = request.args.get('month')
    year = request.args.get('year')
    query = {'uid': uid}
    if month is not None and year is not None:
        month = int(month) + 1
        year = int(year)
        query['$expr'] = {
            '$and': [
                { '$eq': [{ '$month': { '$dateFromString': { 'dateString': '$date' } } }, month] },
                { '$eq': [{ '$year': { '$dateFromString': { 'dateString': '$date' } } }, year] }
            ]
        }
    expenses = list(db[EXPENSES_COLLECTION].find(query).sort('date', -1))
    return jsonify([serialize_expense(e) for e in expenses])

@app.route('/api/expenses/<expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    db = get_db()
    result = db[EXPENSES_COLLECTION].delete_one({'_id': ObjectId(expense_id)})
    return jsonify({'status': 'success' if result.deleted_count == 1 else 'not found'}), 200 if result.deleted_count else 404

@app.route('/api/incomes', methods=['POST'])
def add_income():
    db = get_db()
    data = request.json
    required = ['uid', 'date', 'amount', 'source', 'description']
    for field in required:
        if field not in data:
            return jsonify({'error': f'Missing field: {field}'}), 400
    income = {
        'uid': data['uid'],
        'date': data['date'],
        'amount': float(data['amount']),
        'source': data['source'],
        'description': data['description']
    }
    db[INCOMES_COLLECTION].insert_one(income)
    return jsonify({'status': 'success'})

@app.route('/api/incomes/<uid>', methods=['GET'])
def get_incomes(uid):
    db = get_db()
    month = request.args.get('month')
    year = request.args.get('year')
    query = {'uid': uid}
    if month is not None and year is not None:
        month = int(month) + 1
        year = int(year)
        query['$expr'] = {
            '$and': [
                { '$eq': [{ '$month': { '$dateFromString': { 'dateString': '$date' } } }, month] },
                { '$eq': [{ '$year': { '$dateFromString': { 'dateString': '$date' } } }, year] }
            ]
        }
    incomes = list(db[INCOMES_COLLECTION].find(query).sort('date', -1))
    for inc in incomes:
        inc['_id'] = str(inc['_id'])
    return jsonify(incomes)

@app.route('/api/incomes/<income_id>', methods=['DELETE'])
def delete_income(income_id):
    db = get_db()
    result = db[INCOMES_COLLECTION].delete_one({'_id': ObjectId(income_id)})
    return jsonify({'status': 'success' if result.deleted_count == 1 else 'not found'}), 200 if result.deleted_count else 404

@app.route('/api/budget/<uid>', methods=['GET'])
def get_budget(uid):
    db = get_db()
    doc = db[BUDGETS_COLLECTION].find_one({'uid': uid})
    return jsonify({'uid': uid, 'amount': doc['amount'] if doc else 20000})

@app.route('/api/budget', methods=['POST'])
def set_budget():
    db = get_db()
    data = request.json
    uid = data.get('uid')
    amount = data.get('amount')
    if not uid or amount is None:
        return jsonify({'error': 'Missing uid or amount'}), 400
    db[BUDGETS_COLLECTION].update_one({'uid': uid}, {'$set': {'amount': amount}}, upsert=True)
    return jsonify({'status': 'success'})

# --- AI SUGGESTION LOGIC ---
def get_suggestions(transactions):
    expenses = [t for t in transactions if t['type'] == 'expense']
    incomes = [t for t in transactions if t['type'] == 'income']
    suggestions = []

    if len(expenses) > 1:
        if expenses[-1]['amount'] > expenses[-2]['amount']:
            suggestions.append('Your expenses are increasing. Consider reviewing your spending habits.')
        avg_expense = sum(e['amount'] for e in expenses) / len(expenses)
        if expenses[-1]['amount'] > avg_expense * 1.2:
            suggestions.append('Recent expense is much higher than your average. Watch out for budget overruns!')

    if len(incomes) > 1:
        if incomes[-1]['amount'] < incomes[-2]['amount']:
            suggestions.append('Your income has reduced recently. Consider diversifying your income sources.')

    if len(expenses) >= 3 and len(incomes) >= 3:
        total_exp = sum(e['amount'] for e in expenses[-3:])
        total_inc = sum(i['amount'] for i in incomes[-3:])
        if total_exp > 0.8 * total_inc:
            suggestions.append('Your recent expenses are close to your income. You may exceed your budget this month.')

    if not suggestions:
        suggestions.append('Your finances look stable. Keep tracking your income and expenses!')

    return suggestions

# --- ADMIN USER FETCH ENDPOINT ---
@app.route('/admin/list-users', methods=['GET'])
def list_users():
    users = []
    page = auth.list_users()
    for user in page.iterate_all():
        users.append({
            'uid': user.uid,
            'displayName': user.display_name or '',
            'email': user.email or '',
            'createdAt': datetime.fromtimestamp(user.user_metadata.creation_timestamp / 1000).strftime('%Y-%m-%d %H:%M:%S') if user.user_metadata and user.user_metadata.creation_timestamp else '',
            'disabled': user.disabled
        })
    return jsonify(users)

@app.route('/admin/delete-user/<uid>', methods=['DELETE'])
def delete_user(uid):
    try:
        auth.delete_user(uid)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/admin/create-user', methods=['POST'])
def create_user():
    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    if not name or not email or not password:
        return jsonify({'success': False, 'error': 'All fields are required.'}), 400
    try:
        user = auth.create_user(
            email=email,
            password=password,
            display_name=name
        )
        return jsonify({'success': True, 'uid': user.uid})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/admin/change-password/<uid>', methods=['POST'])
def change_password(uid):
    data = request.get_json()
    password = data.get('password', '')
    if not password or len(password) < 6:
        return jsonify({'success': False, 'error': 'Password must be at least 6 characters.'}), 400
    try:
        auth.update_user(uid, password=password)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/admin/toggle-disable/<uid>', methods=['POST'])
def toggle_disable(uid):
    data = request.get_json()
    disabled = data.get('disabled', False)
    try:
        auth.update_user(uid, disabled=disabled)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

# --- FRONTEND ROUTES ---
@app.route('/')
def home_page():
    return render_template('home.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/signup')
def signup_page():
    return render_template('signup.html')

@app.route('/expense')
def expense_page():
    return render_template('expense.html')

@app.route('/income')
def income_page():
    return render_template('income.html')

@app.route('/profile')
def profile_page():
    return render_template('profile.html')

@app.route('/admin/aistatus')
def admin_aistatus_page():
    return render_template('aistatus.html')

@app.route('/admin/dashboard')
def admin_dashboard_page():
    return render_template('dashboard.html')

@app.route('/admin/sidebar')
def admin_sidebar_page():
    return render_template('sidebar.html')

@app.route('/navbar')
def navbar_page():
    return render_template('navbar.html')

@app.route('/admin/login')
def admin_login_page():
    return render_template('admin_login.html')

# --- MAIN ---
if __name__ == '__main__':
    app.run(debug=True)