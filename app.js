/**
 * THE PADDLEBOARD PAVILION — WEBSITE CORE LOGIC
 * Includes: Nav actions, Scroll reveal observers, Accordions, Form handling, and Mock booking widget.
 */

document.addEventListener('DOMContentLoaded', () => {
  
  /* ==========================================================================
     1. Navigation & Sticky Header Behavior
     ========================================================================== */
  const header = document.getElementById('main-header');
  const navToggleBtn = document.getElementById('nav-toggle-btn');
  const mainNav = document.getElementById('main-nav');
  const navLinks = document.querySelectorAll('.nav-link, .logo, .nav-cta-btn');
  
  // Sticky header condense on scroll
  window.addEventListener('scroll', () => {
    header.classList.toggle('is-scrolled', window.scrollY > 80);
  }, { passive: true });
  
  // Initial check on load
  header.classList.toggle('is-scrolled', window.scrollY > 80);

  // Mobile navigation drawer toggle
  if (navToggleBtn && mainNav) {
    navToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = navToggleBtn.getAttribute('aria-expanded') === 'true';
      navToggleBtn.setAttribute('aria-expanded', !isExpanded);
      navToggleBtn.classList.toggle('open');
      mainNav.classList.toggle('open');
    });

    // Close menu when clicking outside of it
    document.addEventListener('click', (e) => {
      if (mainNav.classList.contains('open') && !mainNav.contains(e.target) && e.target !== navToggleBtn) {
        navToggleBtn.setAttribute('aria-expanded', 'false');
        navToggleBtn.classList.remove('open');
        mainNav.classList.remove('open');
      }
    });
  }

  // Smooth scroll and active state highlighting
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId && targetId.startsWith('#')) {
        e.preventDefault();
        
        // Close mobile nav drawer if open
        if (mainNav.classList.contains('open')) {
          navToggleBtn.setAttribute('aria-expanded', 'false');
          navToggleBtn.classList.remove('open');
          mainNav.classList.remove('open');
        }

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          const headerOffset = 70;
          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.scrollY - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }
    });
  });

  // Hero parallax motion on scroll (subtle, disabled for reduced-motion)
  const heroImage = document.querySelector('.hero-bg-image');
  if (heroImage && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.addEventListener('scroll', () => {
      const scrollPos = window.scrollY;
      if (scrollPos < window.innerHeight) {
        heroImage.style.transform = `scale(1.05) translateY(${scrollPos * 0.15}px)`;
      }
    });
  }


  /* ==========================================================================
     2. Scroll-Triggered Reveal Animations
     ========================================================================== */
  const revealEls = document.querySelectorAll('.reveal');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          if (prefersReducedMotion) {
            entry.target.classList.add('is-visible');
          } else {
            setTimeout(() => entry.target.classList.add('is-visible'), i * 80);
          }
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(el => observer.observe(el));
  } else {
    // Fallback: show everything instantly if observer is not supported
    revealEls.forEach(el => {
      el.classList.add('is-visible');
    });
  }


  /* ==========================================================================
     3. FAQ Accordion Handler
     ========================================================================== */
  const faqTriggers = document.querySelectorAll('.faq-trigger');

  faqTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const parent = trigger.parentElement;
      const panel = trigger.nextElementSibling;
      const isExpanded = trigger.getAttribute('aria-expanded') === 'true';

      // Close all other FAQ items for a cleaner accordion feel
      document.querySelectorAll('.faq-trigger').forEach(otherTrigger => {
        if (otherTrigger !== trigger) {
          otherTrigger.setAttribute('aria-expanded', 'false');
          otherTrigger.nextElementSibling.style.maxHeight = null;
        }
      });

      // Toggle current item
      trigger.setAttribute('aria-expanded', !isExpanded);
      if (!isExpanded) {
        panel.style.maxHeight = panel.scrollHeight + 'px';
      } else {
        panel.style.maxHeight = null;
      }
    });
  });


  /* ==========================================================================
     4. Interactive Mock Booking Widget
     ========================================================================== */
  const dateSlider = document.getElementById('date-slider');
  const timeslotContainer = document.getElementById('timeslot-container');
  const courtToggleButtons = document.querySelectorAll('.court-btn');
  const summarySlotTime = document.getElementById('summary-slot-time');
  const summaryCourtType = document.getElementById('summary-court-type');
  const summaryTotalPrice = document.getElementById('summary-total-price');
  const confirmBookingBtn = document.getElementById('confirm-booking-btn');

  // Modal elements
  const bookingModal = document.getElementById('booking-modal');
  const successModal = document.getElementById('success-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalPayBtn = document.getElementById('modal-pay-btn');
  const modalPayAmount = document.getElementById('modal-pay-amount');
  const modalBookingDetails = document.getElementById('modal-booking-details');
  const successReceiptContent = document.getElementById('success-receipt-content');
  const successCloseBtn = document.getElementById('success-close-btn');

  // Booking State
  let selectedDate = null;
  let selectedCourtType = 'indoor'; // 'indoor' or 'outdoor'
  let selectedTime = null;
  let courtPrice = 350; // Indoor default

  // Populate dynamic dates (next 7 days starting today)
  const initializeDates = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const today = new Date();

    if (!dateSlider) return;
    dateSlider.innerHTML = '';

    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);

      const dayName = days[targetDate.getDay()];
      const dayNum = targetDate.getDate();
      const monthName = months[targetDate.getMonth()];
      const dateString = `${monthName} ${dayNum}, ${targetDate.getFullYear()}`;

      const dateBtn = document.createElement('button');
      dateBtn.type = 'button';
      dateBtn.className = `date-btn ${i === 0 ? 'active' : ''}`;
      dateBtn.dataset.dateVal = dateString;
      
      if (i === 0) selectedDate = dateString;

      dateBtn.innerHTML = `
        <span class="date-day">${i === 0 ? 'Today' : dayName}</span>
        <span class="date-num">${dayNum}</span>
      `;

      dateBtn.addEventListener('click', () => {
        document.querySelectorAll('.date-btn').forEach(btn => btn.classList.remove('active'));
        dateBtn.classList.add('active');
        selectedDate = dateBtn.dataset.dateVal;
        
        // Reset selected slot and refresh timeslots
        selectedTime = null;
        updateBookingSummary();
        generateTimeSlots();
      });

      dateSlider.appendChild(dateBtn);
    }
  };

  // Generate timeslots programmatically with simulated real-time booking rates
  const generateTimeSlots = () => {
    if (!timeslotContainer) return;
    timeslotContainer.innerHTML = '';

    const times = [
      '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
      '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
      '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM'
    ];

    times.forEach(time => {
      // Simulate occupancy: 35% chance a slot is booked/disabled (higher chance on peak hours)
      const hour = parseInt(time.split(':')[0]);
      const isPm = time.includes('PM');
      const isPeakHour = (isPm && hour >= 5 && hour < 10) || (!isPm && hour >= 6 && hour <= 9);
      
      const probability = isPeakHour ? 0.65 : 0.25;
      const isBooked = Math.random() < probability;

      const slotBtn = document.createElement('button');
      slotBtn.type = 'button';
      slotBtn.className = 'timeslot-btn';
      slotBtn.innerText = time;

      if (isBooked) {
        slotBtn.disabled = true;
        slotBtn.title = "Already Booked";
      }

      slotBtn.addEventListener('click', () => {
        document.querySelectorAll('.timeslot-btn').forEach(btn => btn.classList.remove('active'));
        slotBtn.classList.add('active');
        selectedTime = time;
        updateBookingSummary();
      });

      timeslotContainer.appendChild(slotBtn);
    });
  };

  // Court toggle logic
  courtToggleButtons.forEach(button => {
    button.addEventListener('click', () => {
      courtToggleButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      selectedCourtType = button.dataset.courtType;
      courtPrice = selectedCourtType === 'indoor' ? 350 : 300;
      
      // Update pricing, clear chosen slot to prevent pricing mistakes, and refresh list
      selectedTime = null;
      updateBookingSummary();
      generateTimeSlots();
    });
  });

  // Update Booking Summary State
  const updateBookingSummary = () => {
    if (selectedTime) {
      summarySlotTime.innerText = `${selectedDate} @ ${selectedTime}`;
      summaryCourtType.innerText = selectedCourtType === 'indoor' ? 'Indoor climate-controlled court' : 'Classic outdoor court';
      summaryTotalPrice.innerText = `₱${courtPrice}.00`;
      confirmBookingBtn.removeAttribute('disabled');
    } else {
      summarySlotTime.innerText = 'Choose a time';
      summaryCourtType.innerText = selectedCourtType === 'indoor' ? 'Indoor' : 'Outdoor';
      summaryTotalPrice.innerText = '₱0.00';
      confirmBookingBtn.setAttribute('disabled', 'true');
    }
  };

  // Initial Booking widget load
  initializeDates();
  generateTimeSlots();

  /* Modal Actions */
  const openModal = (modal) => {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = (modal) => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  // Launch checkout confirmation dialog
  if (confirmBookingBtn) {
    confirmBookingBtn.addEventListener('click', () => {
      const bookingRef = 'PBP-' + Math.floor(100000 + Math.random() * 900000);
      
      modalPayAmount.innerText = courtPrice;
      modalBookingDetails.innerHTML = `
        <div class="modal-receipt-item">
          <span>Booking Reference</span>
          <strong>${bookingRef}</strong>
        </div>
        <div class="modal-receipt-item">
          <span>Court Type</span>
          <strong>${selectedCourtType === 'indoor' ? 'Indoor Climate-Controlled' : 'Classic Outdoor'}</strong>
        </div>
        <div class="modal-receipt-item">
          <span>Date</span>
          <strong>${selectedDate}</strong>
        </div>
        <div class="modal-receipt-item">
          <span>Time Slot</span>
          <strong>${selectedTime} (1 Hour)</strong>
        </div>
        <div class="modal-receipt-item">
          <span>Rate</span>
          <strong>₱${courtPrice}.00 / hr</strong>
        </div>
        <div class="modal-receipt-item" style="border-top: 1px solid var(--color-border); margin-top: 12px; padding-top: 12px;">
          <span>Total Price</span>
          <strong style="color: var(--color-primary-dark); font-size: 1.15rem;">₱${courtPrice}.00</strong>
        </div>
      `;

      // Store booking reference on pay button dataset
      modalPayBtn.dataset.bookingRef = bookingRef;

      openModal(bookingModal);
    });
  }

  // Dismiss checkout modal
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', () => closeModal(bookingModal));
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', () => closeModal(bookingModal));

  // Proceed with pay checkout logic
  if (modalPayBtn) {
    modalPayBtn.addEventListener('click', () => {
      const refCode = modalPayBtn.dataset.bookingRef;
      
      closeModal(bookingModal);

      // Play checkout payment loader
      modalPayBtn.innerHTML = '<span>Processing Payment...</span>';
      modalPayBtn.disabled = true;

      setTimeout(() => {
        // Reset payment button state
        modalPayBtn.innerHTML = `<span>Proceed to Pay (₱${courtPrice})</span>`;
        modalPayBtn.removeAttribute('disabled');

        // Populate Success Receipt details
        successReceiptContent.innerHTML = `
          <div class="modal-receipt-item">
            <span>Payment Receipt</span>
            <strong>${refCode}</strong>
          </div>
          <div class="modal-receipt-item">
            <span>Court Details</span>
            <strong>${selectedCourtType === 'indoor' ? 'Indoor Court' : 'Outdoor Court'}</strong>
          </div>
          <div class="modal-receipt-item">
            <span>Scheduled Time</span>
            <strong>${selectedDate} @ ${selectedTime}</strong>
          </div>
          <div class="modal-receipt-item">
            <span>Location</span>
            <strong>Mabolo, Cebu City</strong>
          </div>
          <div class="modal-receipt-item" style="border-top: 1px dashed var(--color-border); margin-top: 10px; padding-top: 10px;">
            <span>Amount Paid</span>
            <strong style="color: var(--color-primary-dark);">₱${courtPrice}.00</strong>
          </div>
        `;
        
        openModal(successModal);
      }, 1200); // 1.2s loader transition
    });
  }

  // Complete flow close button
  if (successCloseBtn) {
    successCloseBtn.addEventListener('click', () => {
      closeModal(successModal);
      // Reset Scheduler State
      selectedTime = null;
      updateBookingSummary();
      generateTimeSlots();
    });
  }


  /* ==========================================================================
     5. Newsletter Form Submission Handling
     ========================================================================== */
  const newsletterForm = document.getElementById('newsletter-form');
  const newsletterFeedback = document.getElementById('newsletter-feedback');

  if (newsletterForm && newsletterFeedback) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('news-name');
      const emailInput = document.getElementById('news-email');
      const submitBtn = newsletterForm.querySelector('button[type="submit"]');

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();

      // Clear previous styles
      newsletterFeedback.className = 'form-feedback';
      newsletterFeedback.innerText = '';

      if (!name) {
        newsletterFeedback.classList.add('error');
        newsletterFeedback.innerText = 'Please enter your first name.';
        nameInput.focus();
        return;
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        newsletterFeedback.classList.add('error');
        newsletterFeedback.innerText = 'Please enter a valid email address.';
        emailInput.focus();
        return;
      }

      // Mock submitting feedback
      submitBtn.disabled = true;
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span>Subscribing...</span>';

      setTimeout(() => {
        newsletterFeedback.classList.add('success');
        newsletterFeedback.innerText = `Thank you, ${name}! You have successfully subscribed to our newsletter.`;
        
        // Reset Form inputs
        nameInput.value = '';
        emailInput.value = '';
        submitBtn.innerHTML = originalText;
        submitBtn.removeAttribute('disabled');

        // Clear feedback after 6 seconds
        setTimeout(() => {
          newsletterFeedback.innerText = '';
          newsletterFeedback.className = 'form-feedback';
        }, 6000);
      }, 1000);
    });
  }
});
