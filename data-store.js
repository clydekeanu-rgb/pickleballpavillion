(function () {
  const STORAGE = {
    role: 'pbp_admin_role',
    courts: 'pbp_admin_courts',
    bookings: 'pbp_admin_bookings',
    blocks: 'pbp_admin_blocks',
    staff: 'pbp_admin_staff',
    members: 'pbp_admin_members'
  };

  const OPERATING_START = 6;
  const OPERATING_END = 22;
  const MEMBER_RATES = {
    basic: 999,
    pro: 1999,
    unlimited: 3499
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let courts = [];
  let bookings = [];
  let courtBlocks = [];
  let staffProfiles = [];
  let members = [];

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

  function addMonths(date, amount) {
    const next = new Date(date);
    next.setMonth(next.getMonth() + amount);
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
    localStorage.setItem(STORAGE.members, JSON.stringify(members));
  }

  function saveBookings() {
    localStorage.setItem(STORAGE.bookings, JSON.stringify(bookings));
  }

  function saveStaff() {
    localStorage.setItem(STORAGE.staff, JSON.stringify(staffProfiles));
  }

  function saveMembers() {
    localStorage.setItem(STORAGE.members, JSON.stringify(members));
  }

  function seedCourts() {
    return [
      { id: 'indoor-1', name: 'Indoor Court 1', type: 'indoor', rate: 350 },
      { id: 'indoor-2', name: 'Indoor Court 2', type: 'indoor', rate: 350 },
      { id: 'indoor-3', name: 'Indoor Court 3', type: 'indoor', rate: 350 },
      { id: 'indoor-4', name: 'Indoor Court 4', type: 'indoor', rate: 350 },
      { id: 'indoor-5', name: 'Indoor Court 5', type: 'indoor', rate: 350 },
      { id: 'indoor-6', name: 'Indoor Court 6', type: 'indoor', rate: 350 },
      { id: 'outdoor-1', name: 'Outdoor Court 1', type: 'outdoor', rate: 300 },
      { id: 'outdoor-2', name: 'Outdoor Court 2', type: 'outdoor', rate: 300 }
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
      { id: 'block-001', courtId: 'indoor-1', scope: 'single-court', recurrence: 'none', date: formatDate(addDays(today, 6)), dayOfWeek: null, startTime: '09:00', endTime: '11:00', reason: 'Court resurfacing', recurrenceEndDate: null },
      { id: 'block-002', courtId: 'indoor-2', scope: 'single-court', recurrence: 'weekly', date: null, dayOfWeek: 1, startTime: '09:00', endTime: '11:00', reason: 'Routine maintenance', recurrenceEndDate: null },
      { id: 'block-003', courtId: null, scope: 'all-courts', recurrence: 'none', date: formatDate(addDays(today, -2)), dayOfWeek: null, startTime: '18:00', endTime: '20:00', reason: 'Private clinic setup', recurrenceEndDate: null },
      { id: 'block-004', courtId: 'outdoor-2', scope: 'single-court', recurrence: 'none', date: formatDate(addDays(today, 12)), dayOfWeek: null, startTime: '15:00', endTime: '17:00', reason: 'Net replacement', recurrenceEndDate: null }
    ];
  }

  function seedStaff() {
    return [
      { id: 'staff-001', name: 'Ana Reyes', email: 'ana@pickleballpavilion.ph', role: 'owner' },
      { id: 'staff-002', name: 'Jomar Cruz', email: 'jomar@pickleballpavilion.ph', role: 'staff' },
      { id: 'staff-003', name: 'Liza Tan', email: 'liza@pickleballpavilion.ph', role: 'staff' }
    ];
  }

  function seedMembers() {
    const names = [
      'Maria Santos', 'Paolo Garcia', 'Celine Lim', 'Ramon Dela Cruz',
      'Bianca Ong', 'Nico Tan', 'Grace Villanueva', 'Miguel Reyes',
      'Jasmine Uy', 'Carlo Mendoza', 'Tessa Chua', 'Andre Navarro',
      'Leah Castillo', 'Rafi Bautista', 'Mika Sy', 'Jonas Aquino',
      'Patricia Go', 'Kenji Ramos', 'Sofia Mercado', 'Daniel Yu'
    ];
    return names.map((name, index) => {
      const tier = index % 7 === 0 ? 'unlimited' : index % 3 === 0 || index % 3 === 1 ? 'basic' : 'pro';
      const status = [4, 9, 14, 18].includes(index) ? 'cancelled' : 'active';
      const joinDate = addDays(addMonths(today, -6 + (index % 6)), index * 3);
      let renewalDate = addMonths(joinDate, 1);
      while (status === 'active' && renewalDate < today) {
        renewalDate = addMonths(renewalDate, 1);
      }
      if (status === 'cancelled') {
        renewalDate = addDays(today, -10 - index);
      }

      return {
        id: `member-${String(index + 1).padStart(3, '0')}`,
        name,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.ph`,
        contact: `09${18 + (index % 6)}-444-${String(220 + index).padStart(4, '0')}`,
        tier,
        monthlyRate: MEMBER_RATES[tier],
        joinDate: formatDate(joinDate),
        renewalDate: formatDate(renewalDate),
        status
      };
    });
  }

  function resetData() {
    courts = seedCourts();
    bookings = seedBookings();
    courtBlocks = seedBlocks();
    staffProfiles = seedStaff();
    members = seedMembers();
    saveAll();
  }

  function loadData() {
    courts = readJson(STORAGE.courts, null);
    bookings = readJson(STORAGE.bookings, null);
    courtBlocks = readJson(STORAGE.blocks, null);
    staffProfiles = readJson(STORAGE.staff, null);
    members = readJson(STORAGE.members, null);

    if (!courts || !bookings || !courtBlocks || !staffProfiles || !members) {
      resetData();
    }
  }

  function courtName(courtId) {
    const court = courts.find((item) => item.id === courtId);
    return court ? court.name : 'All Courts';
  }

  function courtById(courtId) {
    return courts.find((item) => item.id === courtId) || null;
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

  function getAvailableCourts(dateString, startTime, courtType) {
    const endTime = endSlot(startTime);
    return courts
      .filter((court) => court.type === courtType)
      .filter((court) => !slotTaken(court.id, dateString, startTime) && !slotBlockReason(court.id, dateString, startTime, endTime));
  }

  function addOnlineBooking({ courtType, date, startTime, customerName, contact, partySize }) {
    const candidates = getAvailableCourts(date, startTime, courtType);
    if (!candidates.length) return null;
    const court = candidates[0];
    const booking = {
      id: `bk-${Date.now()}`,
      courtId: court.id,
      date,
      startTime,
      endTime: endSlot(startTime),
      customerName,
      contact,
      partySize,
      status: 'confirmed',
      source: 'online',
      createdBy: null
    };
    bookings.push(booking);
    saveBookings();
    return booking;
  }

  loadData();

  window.PBPStore = {
    STORAGE,
    OPERATING_START,
    OPERATING_END,
    DAILY_CAPACITY: 8 * (OPERATING_END - OPERATING_START),
    MEMBER_RATES,
    today,
    get courts() { return courts; },
    get bookings() { return bookings; },
    get courtBlocks() { return courtBlocks; },
    get staffProfiles() { return staffProfiles; },
    get members() { return members; },
    set staffProfiles(value) { staffProfiles = value; saveStaff(); },
    set members(value) { members = value; saveMembers(); },
    pad,
    formatDate,
    parseLocalDate,
    addDays,
    makeSlot,
    endSlot,
    prettyDate,
    prettyTime,
    toCivilTime,
    readJson,
    saveAll,
    saveBookings,
    saveStaff,
    saveMembers,
    resetData,
    loadData,
    seedCourts,
    seedBookings,
    seedBlocks,
    seedStaff,
    seedMembers,
    courtName,
    courtById,
    dateMatchesBlock,
    timeOverlaps,
    blocksForDate,
    slotBlockReason,
    slotTaken,
    validateSlot,
    getAvailableCourts,
    addOnlineBooking
  };
}());
