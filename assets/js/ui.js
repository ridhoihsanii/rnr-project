(function () {
  var TOAST_ICONS = {
    success: 'fa-check-circle',
    danger: 'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  var STATUS_LABELS = {
    setup: 'Setup',
    ongoing: 'Ongoing',
    finished: 'Finished'
  };

  function getElement(id) {
    if (typeof document === 'undefined' || !document.getElementById) {
      return null;
    }

    return document.getElementById(id);
  }

  function toNumber(value, fallback) {
    var number = Number(value);
    return isFinite(number) ? number : fallback;
  }

  function easeOutCubic(progress) {
    return 1 - Math.pow(1 - progress, 3);
  }

  function safeText(element, value) {
    if (element) {
      element.textContent = value;
    }
  }

  function findAll(selector) {
    if (typeof document === 'undefined' || !document.querySelectorAll) {
      return [];
    }

    return document.querySelectorAll(selector);
  }

  function findOne(selector) {
    if (typeof document === 'undefined' || !document.querySelector) {
      return null;
    }

    return document.querySelector(selector);
  }

  function createSkeleton() {
    var wrapper = document.createElement('div');
    var index;

    wrapper.className = 'skeleton-loading';

    for (index = 0; index < 3; index += 1) {
      var row = document.createElement('div');
      row.className = 'skeleton-row';
      wrapper.appendChild(row);
    }

    return wrapper;
  }

  var BilposUI = {
    showToast: function (message, type, duration) {
      var toastContainer = getElement('toast-container');
      var toast;
      var icon;
      var text;
      var toastType = TOAST_ICONS[type] ? type : 'info';
      var timeout = toNumber(duration, 3500);

      if (!toastContainer || !document.createElement) {
        return null;
      }

      toast = document.createElement('div');
      toast.className = 'RNR INTAN-toast toast-' + toastType;

      icon = document.createElement('i');
      icon.className = 'fa ' + TOAST_ICONS[toastType];

      text = document.createElement('span');
      text.textContent = String(message == null ? '' : message);

      toast.appendChild(icon);
      toast.appendChild(text);
      toastContainer.appendChild(toast);

      setTimeout(function () {
        if (toast.classList) {
          toast.classList.add('show');
        }
      }, 10);

      setTimeout(function () {
        if (toast.classList) {
          toast.classList.remove('show');
        }

        setTimeout(function () {
          if (toast.remove) {
            toast.remove();
          } else if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }, timeout);

      return toast;
    },

    animateCounter: function (el, target, duration) {
      var element = el;
      var finalValue;
      var startValue;
      var range;
      var startTime = null;

      if (!element) {
        return;
      }

      finalValue = toNumber(target, 0);
      startValue = toNumber(String(element.textContent || '').replace(/[^\d-]/g, ''), 0);
      duration = toNumber(duration, 600);

      if (duration <= 0 || typeof requestAnimationFrame !== 'function') {
        safeText(element, String(Math.round(finalValue)));
        return;
      }

      range = finalValue - startValue;
      requestAnimationFrame(function step(now) {
        if (startTime === null) {
          startTime = typeof now === 'number' ? now : 0;
        }

        var elapsed = now - startTime;
        var progress = duration === 0 ? 1 : Math.min(elapsed / duration, 1);
        var currentValue = Math.round(startValue + range * easeOutCubic(progress));

        safeText(element, String(currentValue));

        if (progress < 1) {
          requestAnimationFrame(step);
        }
      });
    },

    updateStats: function (stats, tournament) {
      var numericMap;
      var ids;
      var index;

      stats = stats || {};
      tournament = tournament || {};
      numericMap = {
        'stat-total': toNumber(stats.total, 0),
        'stat-cash': toNumber(stats.cash, 0),
        'stat-tf': toNumber(stats.tf, 0),
        'stat-unpaid': toNumber(stats.unpaid, 0),
        'stat-size': toNumber(tournament.size, 0),
        'stat-matches': toNumber(stats.totalMatches, 0),
        'stat-finished': toNumber(stats.finished, 0),
        'stat-remaining': toNumber(stats.remaining, 0)
      };
      ids = Object.keys(numericMap);

      for (index = 0; index < ids.length; index += 1) {
        this.animateCounter(getElement(ids[index]), numericMap[ids[index]], 600);
      }

      safeText(getElement('stat-venue-text'), tournament.venue || 'â€”');
    },

    updateHeader: function (tournament) {
      tournament = tournament || {};

      safeText(getElement('header-venue'), tournament.venue || 'RNR Billiard');
      safeText(getElement('header-status'), STATUS_LABELS[tournament.status] || STATUS_LABELS.setup);
      safeText(
        getElement('header-round'),
        toNumber(tournament.currentRound, 0) > 0 ? 'Round ' + Number(tournament.currentRound) : 'Ready'
      );
    },

    emptyState: function (type) {
      var states = {
        participants: '<div class="empty-state"><div class="empty-icon">ðŸŽ±</div><h5>Belum Ada Peserta</h5><p>Setup tournament terlebih dahulu dan mulai mendaftarkan peserta.</p></div>',
        bracket: '<div class="empty-state"><div class="empty-icon">ðŸ†</div><h5>Bracket Belum Dibuat</h5><p>Tambahkan peserta, lakukan drawing, kemudian bracket akan otomatis terbuat.</p></div>',
        drawing: '<div class="empty-state"><div class="empty-icon">ðŸŽ²</div><h5>Drawing Belum Dilakukan</h5><p>Klik tombol DRAW pada setiap peserta untuk menentukan nomor slot.</p></div>'
      };

      return states[type] || '';
    },

    activateNav: function (sectionId) {
      var navItems = findAll('.sidebar-nav-item');
      var sections = findAll('.bilpos-section');
      var activeNav = findOne('.sidebar-nav-item[data-section="' + sectionId + '"]');
      var activeSection = getElement('section-' + sectionId);
      var index;

      for (index = 0; index < navItems.length; index += 1) {
        if (navItems[index].classList) {
          navItems[index].classList.remove('active');
        }
      }

      if (activeNav && activeNav.classList) {
        activeNav.classList.add('active');
      }

      for (index = 0; index < sections.length; index += 1) {
        if (sections[index].classList) {
          sections[index].classList.remove('active');
        }
        if (sections[index].style) {
          sections[index].style.display = 'none';
        }
      }

      if (activeSection) {
        if (activeSection.classList) {
          activeSection.classList.add('active');
        }
        if (activeSection.style) {
          activeSection.style.display = '';
        }
      }

      if (typeof window !== 'undefined' && window.innerWidth < 992) {
        this.closeSidebar();
      }
    },

    toggleSidebar: function () {
      var sidebar = findOne('.bilpos-sidebar');
      var overlay = findOne('.sidebar-overlay');

      if (sidebar && sidebar.classList) {
        sidebar.classList.toggle('open');
      }

      if (overlay && overlay.classList) {
        overlay.classList.toggle('active');
      }
    },

    closeSidebar: function () {
      var sidebar = findOne('.bilpos-sidebar');
      var overlay = findOne('.sidebar-overlay');

      if (sidebar && sidebar.classList) {
        sidebar.classList.remove('open');
      }

      if (overlay && overlay.classList) {
        overlay.classList.remove('active');
      }
    },

    showLoading: function (containerId) {
      var container = getElement(containerId);

      if (!container) {
        return null;
      }

      this.hideLoading(containerId);
      container.appendChild(createSkeleton());
      return container;
    },

    hideLoading: function (containerId) {
      var container = getElement(containerId);
      var skeletons;
      var index;

      if (!container || !container.querySelectorAll) {
        return;
      }

      skeletons = container.querySelectorAll('.skeleton-loading');

      for (index = 0; index < skeletons.length; index += 1) {
        if (skeletons[index].remove) {
          skeletons[index].remove();
        } else if (skeletons[index].parentNode) {
          skeletons[index].parentNode.removeChild(skeletons[index]);
        }
      }
    },

    rippleEffect: function (event) {
      var source = event && (event.currentTarget || event.target);
      var ripple;
      var size;
      var left;
      var top;

      if (!source || !document.createElement) {
        return null;
      }

      ripple = document.createElement('span');
      ripple.className = 'ripple';
      size = Math.max(source.clientWidth || 0, source.clientHeight || 0);
      left = toNumber(event && event.clientX, 0) - toNumber(source.offsetLeft, 0) - size / 2;
      top = toNumber(event && event.clientY, 0) - toNumber(source.offsetTop, 0) - size / 2;

      ripple.style.width = size + 'px';
      ripple.style.height = size + 'px';
      ripple.style.left = left + 'px';
      ripple.style.top = top + 'px';

      source.appendChild(ripple);

      setTimeout(function () {
        if (ripple.remove) {
          ripple.remove();
        } else if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple);
        }
      }, 600);

      return ripple;
    }
  };

  if (typeof window !== 'undefined') {
    window.BilposUI = BilposUI;
  }
})();

