// ===================================================
// บันทึกรายรับ-รายจ่าย LIFF App
// by.MerCy-TKM
// ===================================================

// ⚙️ ตั้งค่า — ใส่ LIFF ID ของคุณที่นี่
const LIFF_ID = "2010003426-IEaXAwMO"; // เช่น "1234567890-abcdefgh"

// State
let currentType = 'income';
let currentCategory = null;
let currentPeriod = 'day';
let currentFilter = 'all';
let transactions = [];
let userProfile = null;
let config = {
  webAppUrl: '',
  sheetId: ''
};

// หมวดหมู่
const CATEGORIES = {
  income: [
    { id: 'salary', name: 'เงินเดือน', icon: 'ti-cash' },
    { id: 'bonus', name: 'โบนัส', icon: 'ti-gift' },
    { id: 'freelance', name: 'ฟรีแลนซ์', icon: 'ti-briefcase' },
    { id: 'investment', name: 'ลงทุน', icon: 'ti-trending-up' },
    { id: 'business', name: 'ธุรกิจ', icon: 'ti-building-store' },
    { id: 'gift_in', name: 'ของขวัญ', icon: 'ti-gift-card' },
    { id: 'refund', name: 'คืนเงิน', icon: 'ti-receipt-refund' },
    { id: 'other_in', name: 'อื่นๆ', icon: 'ti-dots' }
  ],
  expense: [
    { id: 'food', name: 'อาหาร', icon: 'ti-bowl-chopsticks' },
    { id: 'transport', name: 'เดินทาง', icon: 'ti-car' },
    { id: 'fuel', name: 'น้ำมัน', icon: 'ti-gas-station' },
    { id: 'shopping', name: 'ช็อปปิ้ง', icon: 'ti-shopping-bag' },
    { id: 'bills', name: 'บิล', icon: 'ti-file-invoice' },
    { id: 'health', name: 'สุขภาพ', icon: 'ti-stethoscope' },
    { id: 'entertainment', name: 'บันเทิง', icon: 'ti-device-tv' },
    { id: 'education', name: 'การศึกษา', icon: 'ti-book' },
    { id: 'home', name: 'ที่พัก', icon: 'ti-home' },
    { id: 'family', name: 'ครอบครัว', icon: 'ti-users' },
    { id: 'pet', name: 'สัตว์เลี้ยง', icon: 'ti-paw' },
    { id: 'other_out', name: 'อื่นๆ', icon: 'ti-dots' }
  ]
};

// ===================================================
// INIT
// ===================================================
async function initApp() {
  // โหลด config จาก localStorage
  const savedConfig = localStorage.getItem('expense_config');
  if (savedConfig) {
    config = JSON.parse(savedConfig);
    document.getElementById('sheetIdInput').value = config.sheetId || '';
    document.getElementById('webAppUrl').value = config.webAppUrl || '';
  }

  // เริ่ม LIFF
  try {
    if (LIFF_ID && LIFF_ID !== "YOUR_LIFF_ID_HERE") {
      await liff.init({ liffId: LIFF_ID });
      if (!liff.isLoggedIn()) {
        liff.login();
        return;
      }
      userProfile = await liff.getProfile();
      updateUserUI();
    } else {
      // Mock mode สำหรับทดสอบ
      userProfile = {
        userId: 'test_user_001',
        displayName: 'ผู้ใช้ทดสอบ',
        pictureUrl: null
      };
      updateUserUI();
    }
  } catch (err) {
    console.error('LIFF init error:', err);
    userProfile = {
      userId: 'guest_' + Date.now(),
      displayName: 'ผู้ใช้',
      pictureUrl: null
    };
    updateUserUI();
  }

  // โหลดข้อมูล
  loadLocalTransactions();
  if (config.webAppUrl) {
    await syncFromCloud();
  }

  // วันที่วันนี้
  document.getElementById('dateInput').value = new Date().toISOString().split('T')[0];

  // อัปเดต UI
  updateAllUI();

  // ซ่อน loading
  setTimeout(() => {
    document.getElementById('loadingScreen').style.opacity = '0';
    setTimeout(() => {
      document.getElementById('loadingScreen').style.display = 'none';
    }, 300);
  }, 500);
}

function updateUserUI() {
  if (!userProfile) return;
  document.getElementById('userName').textContent = userProfile.displayName;
  document.getElementById('settingsName').textContent = userProfile.displayName;
  document.getElementById('settingsId').textContent = 'ID: ' + userProfile.userId.substring(0, 16) + '...';
  if (userProfile.pictureUrl) {
    document.getElementById('userAvatar').innerHTML = `<img src="${userProfile.pictureUrl}">`;
    document.getElementById('settingsAvatar').innerHTML = `<img src="${userProfile.pictureUrl}">`;
  }
}

// ===================================================
// PAGE NAVIGATION
// ===================================================
function switchPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');
  if (page === 'stats') renderCharts();
  if (page === 'all') renderAllList();
  window.scrollTo(0, 0);
}

// ===================================================
// MODAL
// ===================================================
function openModal(type) {
  currentType = type;
  setType(type);
  document.getElementById('addModal').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('addModal').classList.remove('show');
  document.body.style.overflow = '';
  // reset form
  document.getElementById('amountInput').value = '';
  document.getElementById('noteInput').value = '';
  currentCategory = null;
}

function setType(type) {
  currentType = type;
  document.getElementById('typeIncomeBtn').classList.toggle('active', type === 'income');
  document.getElementById('typeExpenseBtn').classList.toggle('active', type === 'expense');
  document.getElementById('submitBtn').classList.toggle('expense', type === 'expense');
  renderCategories();
  currentCategory = null;
}

function renderCategories() {
  const grid = document.getElementById('categoryGrid');
  const cats = CATEGORIES[currentType];
  grid.innerHTML = cats.map(c => `
    <button class="category-btn" data-cat="${c.id}" onclick="selectCategory('${c.id}')">
      <i class="ti ${c.icon}"></i>
      <div class="cat-name">${c.name}</div>
    </button>
  `).join('');
}

function selectCategory(catId) {
  currentCategory = catId;
  document.querySelectorAll('.category-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === catId);
  });
}

// ===================================================
// SAVE TRANSACTION
// ===================================================
async function saveTransaction() {
  const amount = parseFloat(document.getElementById('amountInput').value);
  const note = document.getElementById('noteInput').value.trim();
  const date = document.getElementById('dateInput').value;

  if (!amount || amount <= 0) {
    showToast('กรุณาใส่จำนวนเงิน', 'error');
    return;
  }
  if (!currentCategory) {
    showToast('กรุณาเลือกหมวดหมู่', 'error');
    return;
  }

  const cat = CATEGORIES[currentType].find(c => c.id === currentCategory);
  const transaction = {
    id: 'tx_' + Date.now(),
    userId: userProfile.userId,
    userName: userProfile.displayName,
    type: currentType,
    amount: amount,
    category: currentCategory,
    categoryName: cat.name,
    note: note,
    date: date,
    timestamp: new Date().toISOString()
  };

  // บันทึก local ก่อน
  transactions.unshift(transaction);
  saveLocalTransactions();
  updateAllUI();

  closeModal();
  showToast('บันทึกแล้ว', 'success');

  // ส่งขึ้น Google Sheet
  if (config.webAppUrl) {
    try {
      await sendToCloud(transaction);
    } catch (err) {
      console.error('Sync error:', err);
      showToast('บันทึกในเครื่องแล้ว (รอซิงค์)', 'success');
    }
  }
}

// ===================================================
// CLOUD SYNC (Google Sheets)
// ===================================================
async function sendToCloud(transaction) {
  if (!config.webAppUrl) return;
  try {
    await fetch(config.webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'add', data: transaction })
    });
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

async function syncFromCloud() {
  if (!config.webAppUrl) return;
  try {
    const url = `${config.webAppUrl}?action=list&userId=${encodeURIComponent(userProfile.userId)}`;
    const res = await fetch(url);
    const result = await res.json();
    if (result.success && result.data) {
      transactions = result.data;
      saveLocalTransactions();
      updateAllUI();
    }
  } catch (err) {
    console.error('Sync error:', err);
  }
}

async function syncData() {
  showToast('กำลังซิงค์...', 'success');
  await syncFromCloud();
  showToast('ซิงค์สำเร็จ', 'success');
}

// ===================================================
// LOCAL STORAGE
// ===================================================
function saveLocalTransactions() {
  localStorage.setItem('expense_transactions', JSON.stringify(transactions));
}

function loadLocalTransactions() {
  const saved = localStorage.getItem('expense_transactions');
  if (saved) transactions = JSON.parse(saved);
}

function saveConfig() {
  config.sheetId = document.getElementById('sheetIdInput').value.trim();
  config.webAppUrl = document.getElementById('webAppUrl').value.trim();
  localStorage.setItem('expense_config', JSON.stringify(config));
  showToast('บันทึกการตั้งค่าแล้ว', 'success');
  if (config.webAppUrl) syncFromCloud();
}

function logout() {
  if (!confirm('ออกจากระบบ? (ข้อมูลในเครื่องจะถูกลบ)')) return;
  localStorage.clear();
  if (typeof liff !== 'undefined' && liff.isLoggedIn && liff.isLoggedIn()) {
    liff.logout();
  }
  location.reload();
}

// ===================================================
// UI UPDATE
// ===================================================
function updateAllUI() {
  updateBalance();
  renderRecentList();
  if (document.getElementById('page-stats').classList.contains('active')) {
    renderCharts();
  }
  if (document.getElementById('page-all').classList.contains('active')) {
    renderAllList();
  }
}

function getFilteredTransactions(period) {
  const now = new Date();
  return transactions.filter(t => {
    const d = new Date(t.date);
    if (period === 'day') {
      return d.toDateString() === now.toDateString();
    }
    if (period === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    }
    if (period === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (period === 'year') {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  });
}

function updateBalance() {
  const monthTrans = getFilteredTransactions('month');
  const income = monthTrans.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = monthTrans.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expense;

  document.getElementById('balanceAmount').textContent = '฿ ' + formatNumber(balance);
  document.getElementById('totalIncome').textContent = '฿' + formatNumber(income);
  document.getElementById('totalExpense').textContent = '฿' + formatNumber(expense);
  document.getElementById('statIncome').textContent = '฿' + formatNumber(income);
  document.getElementById('statExpense').textContent = '฿' + formatNumber(expense);
}

function changePeriod(period) {
  currentPeriod = period;
  document.querySelectorAll('.period-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.period === period);
  });
  renderRecentList();
}

function renderRecentList() {
  const list = document.getElementById('recentList');
  const filtered = getFilteredTransactions(currentPeriod).slice(0, 10);
  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <i class="ti ti-receipt"></i>
        <div>ยังไม่มีรายการในช่วงนี้</div>
      </div>`;
    return;
  }
  list.innerHTML = filtered.map(t => renderTransactionItem(t)).join('');
}

function filterAll(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.filter === filter);
  });
  renderAllList();
}

function renderAllList() {
  const list = document.getElementById('allList');
  let filtered = transactions;
  if (currentFilter !== 'all') {
    filtered = transactions.filter(t => t.type === currentFilter);
  }
  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <i class="ti ti-receipt"></i>
        <div>ยังไม่มีรายการ</div>
      </div>`;
    return;
  }
  // จัดกลุ่มตามวันที่
  const groups = {};
  filtered.forEach(t => {
    if (!groups[t.date]) groups[t.date] = [];
    groups[t.date].push(t);
  });
  let html = '';
  Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(date => {
    html += `<div style="font-size: 12px; color: #888; margin: 12px 0 6px; font-weight: 500;">${formatDateThai(date)}</div>`;
    html += groups[date].map(t => renderTransactionItem(t)).join('');
  });
  list.innerHTML = html;
}

function renderTransactionItem(t) {
  const cat = CATEGORIES[t.type].find(c => c.id === t.category) || { icon: 'ti-circle' };
  const sign = t.type === 'income' ? '+' : '-';
  return `
    <div class="transaction-item" onclick="showTransactionDetail('${t.id}')">
      <div class="trans-icon ${t.type}">
        <i class="ti ${cat.icon}"></i>
      </div>
      <div class="trans-info">
        <div class="trans-title">${t.note || t.categoryName}</div>
        <div class="trans-meta">${t.categoryName} · ${formatTimeShort(t.timestamp)}</div>
      </div>
      <div class="trans-amount ${t.type}">${sign}฿${formatNumber(Number(t.amount))}</div>
    </div>
  `;
}

function showTransactionDetail(id) {
  const t = transactions.find(tr => tr.id === id);
  if (!t) return;
  if (confirm(`ลบรายการ "${t.note || t.categoryName}" จำนวน ฿${formatNumber(t.amount)}?`)) {
    deleteTransaction(id);
  }
}

async function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveLocalTransactions();
  updateAllUI();
  showToast('ลบแล้ว', 'success');

  if (config.webAppUrl) {
    try {
      await fetch(config.webAppUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'delete', id: id })
      });
    } catch (err) { console.error(err); }
  }
}

// ===================================================
// CHARTS
// ===================================================
let expenseChartInstance = null;
let trendChartInstance = null;

function renderCharts() {
  // Pie chart รายจ่ายตามหมวดหมู่
  const monthExpense = getFilteredTransactions('month').filter(t => t.type === 'expense');
  const byCategory = {};
  monthExpense.forEach(t => {
    byCategory[t.categoryName] = (byCategory[t.categoryName] || 0) + Number(t.amount);
  });

  const labels = Object.keys(byCategory);
  const data = Object.values(byCategory);
  const colors = ['#FF5252', '#FF9800', '#FFC107', '#4CAF50', '#2196F3', '#9C27B0', '#00BCD4', '#E91E63', '#795548', '#607D8B', '#8BC34A', '#FF5722'];

  if (expenseChartInstance) expenseChartInstance.destroy();
  const ctx = document.getElementById('expenseChart').getContext('2d');
  if (labels.length === 0) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.font = '14px IBM Plex Sans Thai';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('ยังไม่มีรายจ่าย', ctx.canvas.width / 2, ctx.canvas.height / 2);
  } else {
    expenseChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{ data: data, backgroundColor: colors, borderWidth: 0 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'IBM Plex Sans Thai', size: 11 }, padding: 8, boxWidth: 12 }
          }
        }
      }
    });
  }

  // Trend chart 7 วัน
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayTrans = transactions.filter(t => t.date === dateStr);
    const inc = dayTrans.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const exp = dayTrans.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    last7.push({
      label: d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
      income: inc,
      expense: exp
    });
  }

  if (trendChartInstance) trendChartInstance.destroy();
  const ctx2 = document.getElementById('trendChart').getContext('2d');
  trendChartInstance = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: last7.map(d => d.label),
      datasets: [
        { label: 'รายรับ', data: last7.map(d => d.income), backgroundColor: '#06C755', borderRadius: 6 },
        { label: 'รายจ่าย', data: last7.map(d => d.expense), backgroundColor: '#FF5252', borderRadius: 6 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { family: 'IBM Plex Sans Thai', size: 11 } } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { font: { family: 'IBM Plex Sans Thai', size: 10 } } },
        x: { ticks: { font: { family: 'IBM Plex Sans Thai', size: 10 } } }
      }
    }
  });
}

// ===================================================
// EXPORT
// ===================================================
function exportData() {
  if (transactions.length === 0) {
    showToast('ไม่มีข้อมูลให้ส่งออก', 'error');
    return;
  }
  const headers = ['วันที่', 'ประเภท', 'หมวดหมู่', 'รายละเอียด', 'จำนวนเงิน'];
  const rows = transactions.map(t => [
    t.date,
    t.type === 'income' ? 'รายรับ' : 'รายจ่าย',
    t.categoryName,
    t.note || '',
    t.amount
  ]);
  const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expense_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('ส่งออกสำเร็จ', 'success');
}

// ===================================================
// HELPERS
// ===================================================
function formatNumber(n) {
  return Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 });
}

function formatTimeShort(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'เมื่อสักครู่';
  if (diff < 3600) return Math.floor(diff / 60) + ' นาทีที่แล้ว';
  if (diff < 86400) return Math.floor(diff / 3600) + ' ชั่วโมงที่แล้ว';
  if (diff < 172800) return 'เมื่อวาน';
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

function formatDateThai(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'วันนี้';
  if (d.toDateString() === yesterday.toDateString()) return 'เมื่อวาน';
  return d.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.querySelector('span').textContent = msg;
  toast.className = 'toast show ' + type;
  setTimeout(() => toast.classList.remove('show'), 2200);
}

// ===================================================
// START
// ===================================================
document.addEventListener('DOMContentLoaded', initApp);

// ป้องกันปิด modal เมื่อแตะข้างใน
document.getElementById('addModal').addEventListener('click', (e) => {
  if (e.target.id === 'addModal') closeModal();
});
