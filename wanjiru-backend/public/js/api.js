/* ============================================================
   api.js — Centralized fetch wrapper for Wanjiru Bakery
   Connects frontend to Node.js + Express + Supabase backend
   ============================================================ */

const API_BASE = 'http://localhost:5000/api';

/* ---------- Core request wrapper ---------- */
async function request(path, { method = 'GET', body, auth = true } = {}) {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (auth) {
        const token = localStorage.getItem('wb_token');

        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }
    }

    const response = await fetch(API_BASE + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    let data = {};

    try {
        data = await response.json();
    } catch (error) {
        data = {};
    }

    if (!response.ok) {
        throw new Error(data.message || 'Request failed');
    }

    return data;
}

/* ---------- Auth API ---------- */
const AuthAPI = {
    login: (credentials) =>
        request('/auth/login', {
            method: 'POST',
            body: credentials,
            auth: false,
        }),

    getCurrentUser: () => request('/auth/me'),
};

/* ---------- Orders API ---------- */
const OrdersAPI = {
    list: async () => {
        const data = await request('/orders');
        if (!Array.isArray(data.orders)) {
            throw new Error('Invalid orders response from server');
        }
        return data.orders.map((order) => ({
            ...order,
            item: order.item ?? order.item_name,
            expected_date: order.expected_date ?? order.expected_delivery_date,
            cost: order.cost ?? order.estimated_cost,
            created_at: order.created_at ?? order.order_date,
        }));
    },

    create: (payload) =>
        request('/orders', {
            method: 'POST',
            body: payload,
        }),

    checkDuplicate: (supplierId, itemName) =>
        request(
            `/orders/duplicate-check?supplier_id=${encodeURIComponent(
                supplierId
            )}&item_name=${encodeURIComponent(itemName)}`
        ),

    updateStatus: (id, status, statusNote) =>
        request(`/orders/${id}/status`, {
            method: 'PATCH',
            body: {
                status,
                status_note: statusNote,
            },
        }),
};

/* ---------- Suppliers API ---------- */
const SuppliersAPI = {
    list: async () => {
        const data = await request('/suppliers');
        if (!Array.isArray(data.suppliers)) {
            throw new Error('Invalid suppliers response from server');
        }
        return data.suppliers.map((supplier) => ({
            ...supplier,
            name: supplier.name ?? supplier.supplier_name,
            category: supplier.category ?? supplier.products_supplied,
        }));
    },

    create: ({ name, phone, email, category }) =>
        request('/suppliers', {
            method: 'POST',
            body: {
                supplier_name: name,
                phone,
                email,
                products_supplied: category,
            },
        }),
};

/* ---------- Helpers ---------- */
function money(value) {
    const number = Number(value) || 0;
    return 'Ksh ' + number.toLocaleString('en-KE');
}

function statusBadge(status) {
    const safeStatus = status || 'pending';
    const className = 'badge badge-' + safeStatus;
    const label = safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1);

    return `<span class="${className}">${label}</span>`;
}
