(function () {
  const DEMO_PASSWORD = 'demo1234';
  const STORAGE = {
    role: 'pbp_admin_role',
    courts: 'pbp_admin_courts',
    bookings: 'pbp_admin_bookings',
    blocks: 'pbp_admin_blocks',
    staff: 'pbp_admin_staff'
  };

  const OPERATING_START = 6;
  const OPERATING_END = 22;
  const DAILY_CAPACITY = 8 * (OPERATING_END - OPERATING_START);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let courts = [];
  let bookings = [];
  let courtBlocks = [];
  let staffProfiles = [];
  let currentRole = localStorage.getItem(STORAGE.role);
  let activeTab = 'bookings';
  let calendarCursor = new Date(today.getFullYear(), today.getMonth(), 1);
  let pendingCancelBookingId = null;
  let pendingRemoveStaffId = null;

  const el = {
    loginOverlay: document.getElementById('login-overlay'),
    loginForm: document.getElementById('login-form'),
    loginError: document.getElementById('login-error'),
    dashboardShell: document.getElementById('dashboard-shell'),
    roleBadge: document.getElementById('role-badge'),
    tabNav: document.getElementById('tab-nav'),
    bookingsPanel: document.getElementById('bookings-panel'),
    calendarPanel: document.getElementById('calendar-panel'),
    staffPanel: document.getElementById('staff-panel'),
    bookingsTable: document.getElementById('bookings-table'),
    bookingCount: document.getElementById('booking-count'),
    filterDate: document.getElementById('filter-date'),
    filterCourt: document.getElementById('filter-court'),
    filterStatus: document.getElementById('filter-status'),
    filterSearch: document.getElementById('filter-search'),
    clearDate: document.getElementById('clear-date'),
    openWalkin: document.getElementById('open-walkin'),
    modalBackdrop: document.getElementById('modal-backdrop'),
    walkinModal: document.getElementById('walkin-modal'),
    walkinForm: document.getElementById('walkin-form'),
    walkinName: document.getElementById('walkin-name'),
    walkinContact: document.getElementById('walkin-contact'),
    walkinCourt: document.getElementById('walkin-court'),
    walkinDate: document.getElementById('walkin-date'),
    walkinTime: document.getElementById('walkin-time'),
    walkinParty: document.getElementById('walkin-party'),
    walkinWarning: document.getElementById('walkin-warning'),
    calendarTitle: document.getElementById('calendar-title'),
    calendarGrid: document.getElementById('calendar-grid'),
    prevMonth: document.getElementById('prev-month'),
    nextMonth: document.getElementById('next-month'),
    todayMonth: document.getElementById('today-month'),
    staffModal: document.getElementById('staff-modal'),
    staffForm: document.getElementById('staff-form'),
    staffName: document.getElementById('staff-name'),
    staffEmail: document.getElementById('staff-email'),
    staffRole: document.getElementById('staff-role')
  };

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function formatDate(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseLocalDate(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function addDays(date, amount) {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
  }

  function makeSlot(hour) {
    return `${pad(hour)}:00`;
  }

  function endSlot(startTime) {
    return `${pad(Number(startTime.slice(0, 2)) + 1)}:00`;
  }

  function prettyDate(dateString) {
    return parseLocalDate(dateString).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function prettyTime(startTime, endTime) {
    return `${toCivilTime(startTime)} - ${toCivilTime(endTime)}`;
  }

  function toCivilTime(time) {
    const [hourText, minute] = time.split(':');
    const hour = Number(hourText);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const civilHour = hour % 12 || 12;
    return `${civilHour}:${minute} ${suffix}`;
  }

  function readJson(key, fallback) {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveAll() {
    localStorage.setItem(STORAGE.courts, JSON.stringify(courts));
    localStorage.setItem(STORAGE.bookings, JSON.stringify(bookings));
    localStorage.setItem(STORAGE.blocks, JSON.stringify(courtBlocks));
    localStorage.setItem(STORAGE.staff, JSON.stringify(staffProfiles));
  }

  function seedCourts() {
    return [
      { id: 'indoor-1', name: 'Indoor Court 1', type: 'indoor' },
      { id: 'indoor-2', name: 'Indoor Court 2', type: 'indoor' },
      { id: 'indoor-3', name: 'Indoor Court 3', type: 'indoor' },
      { id: 'indoor-4', name: 'Indoor Court 4', type: 'indoor' },
      { id: 'indoor-5', name: 'Indoor Court 5', type: 'indoor' },
      { id: 'indoor-6', name: 'Indoor Court 6', type: 'indoor' },
      { id: 'outdoor-1', name: 'Outdoor Court 1', type: 'outdoor' },
      { id: 'outdoor-2', name: 'Outdoor Court 2', type: 'outdoor' }
    ];
  }

  function seedBookings() {
    const names = [
      'Maria Santos', 'Paolo Garcia', 'Celine Lim', 'Ramon Dela Cruz',
      'Bianca Ong', 'Nico Tan', 'Grace Villanueva', 'Miguel Reyes',
      'Jasmine Uy', 'Carlo Mendoza', 'Tessa Chua', 'Andre Navarro',
      'Leah Castillo', 'Rafi Bautista', 'Mika Sy', 'Jonas Aquino',
      'Patricia Go', 'Kenji Ramos', 'Sofia Mercado', 'Daniel Yu',
      'Alyssa Flores', 'Marco Chan', 'Irene Lopez', 'Luis Abad',
      'Kara Salazar', 'Enzo Villamor', 'Bea Serrano', 'Noel Yap',
      'Camille Cruz', 'Anton Rivera', 'Elaine Co', 'Diego Mateo',
      'Hannah Ong', 'Victor Lao', 'Rina Solis', 'Joshua Lim',
      'Nina Valdez', 'Samson Lee', 'Mara Robles'
    ];
    const busyOffsets = [-5, -1, 2, 4, 8, 11];
    const quietOffsets = [-9, -7, 6, 13];
    const output = [];
    const usedSlots = new Set();
    let id = 1;

    function desiredCount(offset) {
      if (busyOffsets.includes(offset)) return 4 + (Math.abs(offset) % 3);
      if (quietOffsets.includes(offset)) return 1;
      return Math.abs(offset) % 2 === 0 ? 2 : 3;
    }

    for (let offset = -10; offset <= 10 && output.length < 39; offset += 1) {
      const dateString = formatDate(addDays(today, offset));
      const count = desiredCount(offset);

      for (let i = 0; i < count && output.length < 39; i += 1) {
        const court = courts[(offset + i + courts.length * 3) % courts.length];
        const hour = 7 + ((offset * 3 + i * 4 + 64) % 14);
        const startTime = makeSlot(hour);
        const slotKey = `${court.id}-${dateString}-${startTime}`;
        if (usedSlots.has(slotKey)) continue;
        usedSlots.add(slotKey);

        const name = names[(id - 1) % names.length];
        output.push({
          id: `bk-${pad(id).padStart(3, '0')}`,
          courtId: court.id,
          date: dateString,
          startTime,
          endTime: endSlot(startTime),
          customerName: name,
          contact: `09${17 + (id % 7)}-555-${String(140 + id).padStart(4, '0')}`,
          partySize: 2 + (id % 3),
          status: id % 9 === 0 ? 'cancelled' : 'confirmed',
          source: id % 5 === 0 ? 'walk-in' : 'online',
          createdBy: id % 5 === 0 ? 'staff-demo' : null
        });
        id += 1;
      }
    }

    return output;
  }

  function seedBlocks() {
    return [
      {
        id: 'block-001',
        courtId: 'indoor-1',
        scope: 'single-court',
        recurrence: 'none',
        date: formatDate(addDays(today, 6)),
        dayOfWeek: null,
        startTime: '09:00',
        endTime: '11:00',
        reason: 'Court resurfacing',
        recurrenceEndDate: null
      },
      {
        id: 'block-002',
        courtId: 'indoor-2',
        scope: 'single-court',
        recurrence: 'weekly',
        date: null,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '11:00',
        reason: 'Routine maintenance',
        recurrenceEndDate: null
      },
      {
        id: 'block-003',
        courtId: null,
        scope: 'all-courts',
        recurrence: 'none',
        date: formatDate(addDays(today, -2)),
        dayOfWeek: null,
        startTime: '18:00',
        endTime: '20:00',
        reason: 'Private clinic setup',
        recurrenceEndDate: null
      },
      {
        id: 'block-004',
        courtId: 'outdoor-2',
        scope: 'single-court',
        recurrence: 'none',
        date: formatDate(addDays(today, 12)),
        dayOfWeek: null,
        startTime: '15:00',
        endTime: '17:00',
        reason: 'Net replacement',
        recurrenceEndDate: null
      }
    ];
  }

  function seedStaff() {
    return [
      { id: 'staff-001', name: 'Ana Reyes', email: 'ana@pickleballpavilion.ph', role: 'owner' },
      { id: 'staff-002', name: 'Jomar Cruz', email: 'jomar@pickleballpavilion.ph', role: 'staff' },
      { id: 'staff-003', name: 'Liza Tan', email: 'liza@pickleballpavilion.ph', role: 'staff' }
    ];
  }

  function resetData() {
    courts = seedCourts();
    bookings = seedBookings();
    courtBlocks = seedBlocks();
    staffProfiles = seedStaff();
    saveAll();
  }

  function loadData() {
    courts = readJson(STORAGE.courts, null);
    bookings = readJson(STORAGE.bookings, null);
    courtBlocks = readJson(STORAGE.blocks, null);
    staffProfiles = readJson(STORAGE.staff, null);

    if (!courts || !bookings || !courtBlocks || !staffProfiles) {
      courts = seedCourts();
      bookings = seedBookings();
      courtBlocks = seedBlocks();
      staffProfiles = seedStaff();
      saveAll();
    }
  }

  function courtName(courtId) {
    const court = courts.find((item) => item.id === courtId);
    return court ? court.name : 'All Courts';
  }

  function renderCourtOptions(select, includeAll) {
    select.innerHTML = '';
    if (includeAll) {
      select.append(new Option('All courts', 'all'));
    }
    courts.forEach((court) => {
      select.append(new Option(court.name, court.id));
    });
  }

  function renderTimeOptions() {
    el.walkinTime.innerHTML = '';
    for (let hour = OPERATING_START; hour < OPERATING_END; hour += 1) {
      const value = makeSlot(hour);
      el.walkinTime.append(new Option(`${toCivilTime(value)} - ${toCivilTime(endSlot(value))}`, value));
    }
  }

  function dateMatchesBlock(block, dateString) {
    const date = parseLocalDate(dateString);
    if (block.recurrence === 'weekly') {
      const beforeEnd = !block.recurrenceEndDate || dateString <= block.recurrenceEndDate;
      return block.dayOfWeek === date.getDay() && beforeEnd;
    }
    return block.date === dateString;
  }

  function timeOverlaps(startA, endA, startB, endB) {
    return startA < endB && endA > startB;
  }

  function blocksForDate(dateString) {
    return courtBlocks.filter((block) => dateMatchesBlock(block, dateString));
  }

  function slotBlockReason(courtId, dateString, startTime, endTime) {
    const block = courtBlocks.find((item) => {
      const courtApplies = item.scope === 'all-courts' || item.courtId === courtId;
      return courtApplies &&
        dateMatchesBlock(item, dateString) &&
        timeOverlaps(startTime, endTime, item.startTime, item.endTime);
    });
    return block ? block.reason : null;
  }

  function slotTaken(courtId, dateString, startTime, ignoredBookingId) {
    return bookings.some((booking) => (
      booking.id !== ignoredBookingId &&
      booking.status === 'confirmed' &&
      booking.courtId === courtId &&
      booking.date === dateString &&
      timeOverlaps(startTime, endSlot(startTime), booking.startTime, booking.endTime)
    ));
  }

  function validateSlot(courtId, dateString, startTime) {
    const endTime = endSlot(startTime);
    if (slotTaken(courtId, dateString, startTime)) {
      return `${courtName(courtId)} already has a confirmed booking at ${toCivilTime(startTime)}.`;
    }
    const blockReason = slotBlockReason(courtId, dateString, startTime, endTime);
    if (blockReason) {
      return `${courtName(courtId)} is blocked at that time: ${blockReason}.`;
    }
    return '';
  }

  function sortedBookings() {
    return [...bookings].sort((a, b) => (
      `${a.date} ${a.startTime} ${a.courtId}`.localeCompare(`${b.date} ${b.startTime} ${b.courtId}`)
    ));
  }

  function filteredBookings() {
    const selectedDate = el.filterDate.value;
    const selectedCourt = el.filterCourt.value;
    const selectedStatus = el.filterStatus.value;
    const query = el.filterSearch.value.trim().toLowerCase();
    const todayString = formatDate(today);

    return sortedBookings().filter((booking) => {
      const dateMatches = selectedDate ? booking.date === selectedDate : booking.date >= todayString;
      const courtMatches = selectedCourt === 'all' || booking.courtId === selectedCourt;
      const statusMatches = selectedStatus === 'all' || booking.status === selectedStatus;
      const searchMatches = !query || booking.customerName.toLowerCase().includes(query);
      return dateMatches && courtMatches && statusMatches && searchMatches;
    });
  }

  function renderBookings() {
    const rows = filteredBookings();
    el.bookingsTable.innerHTML = '';

    if (!rows.length) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="9">No bookings match the current filters.</td>';
      el.bookingsTable.append(row);
    } else {
      rows.forEach((booking) => {
        const row = document.createElement('tr');
        row.className = booking.status === 'cancelled' ? 'cancelled-row' : '';
        row.innerHTML = `
          <td>${prettyDate(booking.date)}</td>
          <td>${prettyTime(booking.startTime, booking.endTime)}</td>
          <td>${courtName(booking.courtId)}</td>
          <td>${booking.customerName}</td>
          <td>${booking.contact}</td>
          <td>${booking.partySize}</td>
          <td><span class="status-pill status-${booking.status}">${booking.status}</span></td>
          <td><span class="source-pill">${booking.source}</span></td>
          <td>${renderBookingAction(booking)}</td>
        `;
        el.bookingsTable.append(row);
      });
    }

    el.bookingCount.textContent = `${rows.length} booking${rows.length === 1 ? '' : 's'} shown`;
  }

  function renderBookingAction(booking) {
    if (booking.status !== 'confirmed') {
      return '<span class="muted-status">Soft-cancelled</span>';
    }
    if (pendingCancelBookingId === booking.id) {
      return `
        <span class="confirm-actions">
          <button class="danger-button" type="button" data-confirm-cancel="${booking.id}">Confirm</button>
          <button class="small-button" type="button" data-cancel-cancel="${booking.id}">Keep</button>
        </span>
      `;
    }
    return `<button class="danger-button" type="button" data-start-cancel="${booking.id}">Cancel</button>`;
  }

  function bookingDensity(dateString) {
    const filled = new Set();
    bookings.forEach((booking) => {
      if (booking.status === 'confirmed' && booking.date === dateString) {
        filled.add(`${booking.courtId}-${booking.startTime}`);
      }
    });
    return filled.size;
  }

  function renderCalendar() {
    const monthLabel = calendarCursor.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
    const monthStart = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
    const gridStart = addDays(monthStart, -monthStart.getDay());
    const todayString = formatDate(today);

    el.calendarTitle.textContent = monthLabel;
    el.calendarGrid.innerHTML = '';
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((day) => {
      const header = document.createElement('div');
      header.className = 'weekday';
      header.textContent = day;
      el.calendarGrid.append(header);
    });

    for (let i = 0; i < 42; i += 1) {
      const date = addDays(gridStart, i);
      const dateString = formatDate(date);
      const density = bookingDensity(dateString);
      const hasBlocks = blocksForDate(dateString).length > 0;
      const percent = Math.min(100, Math.round((density / DAILY_CAPACITY) * 100));
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'day-cell';
      if (date.getMonth() !== calendarCursor.getMonth()) cell.classList.add('outside-month');
      if (dateString === todayString) cell.classList.add('today');
      cell.dataset.date = dateString;
      cell.innerHTML = `
        <span class="day-topline">
          <span>${date.getDate()}</span>
          ${hasBlocks ? '<span class="block-marker" aria-label="Court block active"></span>' : ''}
        </span>
        <span class="density-track"><span class="density-fill" style="width: ${percent}%"></span></span>
        <span class="density-label">${density}/${DAILY_CAPACITY} slots booked</span>
      `;
      el.calendarGrid.append(cell);
    }
  }

  function renderStaffPanel() {
    if (currentRole !== 'owner') {
      el.staffPanel.innerHTML = '';
      return;
    }

    el.staffPanel.innerHTML = `
      <div class="staff-toolbar">
        <div>
          <p class="eyebrow">Owner tools</p>
          <h2>Staff</h2>
          <p class="staff-aside">Demo-only mock staff records. There is no backend account creation, invite, or authentication behind this list.</p>
        </div>
        <button id="open-staff-form" class="primary-button" type="button">Add Staff</button>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="staff-table"></tbody>
        </table>
      </div>
    `;

    const tbody = document.getElementById('staff-table');
    staffProfiles.forEach((profile) => {
      const row = document.createElement('tr');
      const action = pendingRemoveStaffId === profile.id
        ? `<span class="confirm-actions">
            <button class="danger-button" type="button" data-confirm-remove="${profile.id}">Confirm</button>
            <button class="small-button" type="button" data-cancel-remove="${profile.id}">Keep</button>
          </span>`
        : `<button class="danger-button" type="button" data-start-remove="${profile.id}">Remove</button>`;
      row.innerHTML = `
        <td>${profile.name}</td>
        <td>${profile.email}</td>
        <td><span class="role-badge">${profile.role}</span></td>
        <td>${action}</td>
      `;
      tbody.append(row);
    });
  }

  function renderTabs() {
    const tabs = [
      { id: 'bookings', label: 'Bookings' },
      { id: 'calendar', label: 'Calendar' }
    ];

    if (currentRole === 'owner') {
      tabs.push({ id: 'staff', label: 'Staff' });
    }

    if (activeTab === 'staff' && currentRole !== 'owner') {
      activeTab = 'bookings';
    }

    el.tabNav.innerHTML = '';
    tabs.forEach((tab) => {
      const button = document.createElement('button');
      button.id = `${tab.id}-tab`;
      button.className = 'tab-button';
      button.type = 'button';
      button.dataset.tab = tab.id;
      button.setAttribute('aria-selected', String(tab.id === activeTab));
      button.textContent = tab.label;
      el.tabNav.append(button);
    });

    el.bookingsPanel.hidden = activeTab !== 'bookings';
    el.calendarPanel.hidden = activeTab !== 'calendar';
    el.staffPanel.hidden = activeTab !== 'staff';
  }

  function renderAll() {
    el.roleBadge.textContent = currentRole === 'owner' ? 'Owner' : 'Staff';
    renderTabs();
    renderBookings();
    renderCalendar();
    renderStaffPanel();
  }

  function showDashboard() {
    el.loginOverlay.hidden = true;
    el.dashboardShell.hidden = false;
    renderAll();
  }

  function showLogin() {
    el.loginOverlay.hidden = false;
    el.dashboardShell.hidden = true;
  }

  function openModal(modal) {
    el.modalBackdrop.hidden = false;
    el.walkinModal.hidden = modal !== el.walkinModal;
    el.staffModal.hidden = modal !== el.staffModal;
  }

  function closeModals() {
    el.walkinModal.hidden = true;
    el.staffModal.hidden = true;
    el.modalBackdrop.hidden = true;
    el.walkinWarning.hidden = true;
  }

  function prepareWalkinForm() {
    el.walkinForm.reset();
    el.walkinDate.value = el.filterDate.value || formatDate(today);
    el.walkinWarning.hidden = true;
    openModal(el.walkinModal);
  }

  function addWalkin() {
    const courtId = el.walkinCourt.value;
    const date = el.walkinDate.value;
    const startTime = el.walkinTime.value;
    const warning = validateSlot(courtId, date, startTime);

    if (warning) {
      el.walkinWarning.textContent = warning;
      el.walkinWarning.hidden = false;
      return;
    }

    bookings.push({
      id: `bk-${Date.now()}`,
      courtId,
      date,
      startTime,
      endTime: endSlot(startTime),
      customerName: el.walkinName.value.trim(),
      contact: el.walkinContact.value.trim(),
      partySize: Number(el.walkinParty.value),
      status: 'confirmed',
      source: 'walk-in',
      createdBy: 'demo-staff'
    });

    localStorage.setItem(STORAGE.bookings, JSON.stringify(bookings));
    closeModals();
    renderBookings();
    renderCalendar();
  }

  function addStaffProfile() {
    // Portfolio mock only: this app pushes a display record and creates no real account, login, invite, or backend identity.
    staffProfiles.push({
      id: `staff-${Date.now()}`,
      name: el.staffName.value.trim(),
      email: el.staffEmail.value.trim(),
      role: el.staffRole.value
    });
    localStorage.setItem(STORAGE.staff, JSON.stringify(staffProfiles));
    closeModals();
    pendingRemoveStaffId = null;
    renderStaffPanel();
  }

  function attachEvents() {
    el.loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const password = document.getElementById('demo-password').value;
      // Demo-only cosmetic gate: this client-side string comparison is visible in source,
      // easy to bypass, and must never be treated or presented as real security.
      if (password !== DEMO_PASSWORD) {
        el.loginError.textContent = 'Use the demo password shown above.';
        el.loginError.hidden = false;
        return;
      }
      currentRole = document.getElementById('demo-role').value;
      localStorage.setItem(STORAGE.role, currentRole);
      el.loginError.hidden = true;
      showDashboard();
    });

    document.getElementById('logout').addEventListener('click', () => {
      localStorage.removeItem(STORAGE.role);
      currentRole = null;
      showLogin();
    });

    document.getElementById('reset-demo').addEventListener('click', () => {
      resetData();
      pendingCancelBookingId = null;
      pendingRemoveStaffId = null;
      renderCourtOptions(el.filterCourt, true);
      renderCourtOptions(el.walkinCourt, false);
      renderAll();
    });

    el.tabNav.addEventListener('click', (event) => {
      const button = event.target.closest('[data-tab]');
      if (!button) return;
      activeTab = button.dataset.tab;
      renderAll();
    });

    [el.filterDate, el.filterCourt, el.filterStatus, el.filterSearch].forEach((control) => {
      control.addEventListener('input', () => {
        pendingCancelBookingId = null;
        renderBookings();
      });
    });

    el.clearDate.addEventListener('click', () => {
      el.filterDate.value = '';
      renderBookings();
    });

    el.bookingsTable.addEventListener('click', (event) => {
      const startButton = event.target.closest('[data-start-cancel]');
      const confirmButton = event.target.closest('[data-confirm-cancel]');
      const keepButton = event.target.closest('[data-cancel-cancel]');

      if (startButton) {
        pendingCancelBookingId = startButton.dataset.startCancel;
        renderBookings();
      }

      if (confirmButton) {
        const booking = bookings.find((item) => item.id === confirmButton.dataset.confirmCancel);
        if (booking) {
          booking.status = 'cancelled';
          localStorage.setItem(STORAGE.bookings, JSON.stringify(bookings));
        }
        pendingCancelBookingId = null;
        renderBookings();
        renderCalendar();
      }

      if (keepButton) {
        pendingCancelBookingId = null;
        renderBookings();
      }
    });

    el.openWalkin.addEventListener('click', prepareWalkinForm);
    el.walkinForm.addEventListener('submit', (event) => {
      event.preventDefault();
      addWalkin();
    });

    [el.walkinCourt, el.walkinDate, el.walkinTime].forEach((control) => {
      control.addEventListener('input', () => {
        const warning = validateSlot(el.walkinCourt.value, el.walkinDate.value, el.walkinTime.value);
        el.walkinWarning.textContent = warning;
        el.walkinWarning.hidden = !warning;
      });
    });

    document.querySelectorAll('[data-close-modal]').forEach((button) => {
      button.addEventListener('click', closeModals);
    });

    el.modalBackdrop.addEventListener('click', (event) => {
      if (event.target === el.modalBackdrop) closeModals();
    });

    el.prevMonth.addEventListener('click', () => {
      calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
      renderCalendar();
    });

    el.nextMonth.addEventListener('click', () => {
      calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
      renderCalendar();
    });

    el.todayMonth.addEventListener('click', () => {
      calendarCursor = new Date(today.getFullYear(), today.getMonth(), 1);
      renderCalendar();
    });

    el.calendarGrid.addEventListener('click', (event) => {
      const cell = event.target.closest('[data-date]');
      if (!cell) return;
      el.filterDate.value = cell.dataset.date;
      activeTab = 'bookings';
      renderAll();
    });

    el.staffPanel.addEventListener('click', (event) => {
      const openButton = event.target.closest('#open-staff-form');
      const startButton = event.target.closest('[data-start-remove]');
      const confirmButton = event.target.closest('[data-confirm-remove]');
      const keepButton = event.target.closest('[data-cancel-remove]');

      if (openButton) {
        el.staffForm.reset();
        openModal(el.staffModal);
      }

      if (startButton) {
        pendingRemoveStaffId = startButton.dataset.startRemove;
        renderStaffPanel();
      }

      if (confirmButton) {
        staffProfiles = staffProfiles.filter((profile) => profile.id !== confirmButton.dataset.confirmRemove);
        localStorage.setItem(STORAGE.staff, JSON.stringify(staffProfiles));
        pendingRemoveStaffId = null;
        renderStaffPanel();
      }

      if (keepButton) {
        pendingRemoveStaffId = null;
        renderStaffPanel();
      }
    });

    el.staffForm.addEventListener('submit', (event) => {
      event.preventDefault();
      addStaffProfile();
    });
  }

  function init() {
    loadData();
    renderCourtOptions(el.filterCourt, true);
    renderCourtOptions(el.walkinCourt, false);
    renderTimeOptions();
    attachEvents();

    if (currentRole === 'owner' || currentRole === 'staff') {
      showDashboard();
    } else {
      showLogin();
    }
  }

  init();
}());
