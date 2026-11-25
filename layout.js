(function () {
    'use strict';

    /* --- Feature check: bail silently on browsers without CE support --- */
    if (!('customElements' in window)) {
        console.warn('layout.js: Custom Elements unsupported. Navbar/footer will not render.');
        return;
    }

    /* --- Config --- */
    var MOBILE_BREAKPOINT = 1024; // must match navbar.css @media (max-width: 1024px)

    /* --- Helpers --- */
    function currentPage() {
        var p = window.location.pathname.split('/').pop();
        return (p && p.toLowerCase()) || 'index.html';
    }

    function isMobile() {
        return window.innerWidth <= MOBILE_BREAKPOINT;
    }

    // Map every sub-page to its parent section so we can highlight
    // the right dropdown toggle when the user is inside a section.
    var SECTION_PARENTS = {
        'master-data.html':            'services.html',
        'implementation.html':         'services.html',
        'digital-transformation.html': 'services.html',
        'interfaces.html':             'services.html',
        'csv.html':                    'services.html',
        'operational-support.html':    'services.html',
        'lims.html':                   'technologies.html',
        'eln.html':                    'technologies.html',
        'empower.html':                'technologies.html',
        'nugenesis.html':              'technologies.html',
        'chromeleon.html':             'technologies.html',
        'moda.html':                   'technologies.html'
    };

    /* ============================================================
       SITE NAVBAR
       ============================================================ */
    class SiteNavbar extends HTMLElement {

        connectedCallback() {
            var page = currentPage();
            var parent = SECTION_PARENTS[page] || '';
            this.innerHTML = this._render(page, parent);
            this._setup();
        }

        disconnectedCallback() {
            this._teardown();
        }

        _render(page, parent) {
            // tiny helpers for active-state markup
            var linkClass = function (href) {
                return href === page ? ' class="active"' :
                       href === parent ? ' class="active"' : '';
            };
            var ariaCurrent = function (href) {
                return href === page ? ' aria-current="page"' : '';
            };
            var toggleClass = function (href) {
                return href === parent ? ' active' : '';
            };

            return `
<nav class="navbar">
    <a href="index.html" class="logo" style="display: inline-flex; align-items: center; gap: clamp(6px, 1.5vw, 12px); text-decoration: none; max-width: 100%; flex-shrink: 1; min-width: 0;">
        <img src="logo.png" alt="AssureInfo Technologies Logo" style="height: clamp(28px, 5vw, 42px); width: auto; flex-shrink: 0; display: block;">
        <span style="font-size: clamp(0.95rem, 2.2vw, 1.25rem); font-weight: 700; line-height: 1.15; letter-spacing: -0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            <span style="color: var(--navy-text);">AssureInfo</span> <span style="color: var(--gold);">Technologies</span>
        </span>
    </a>

    <ul class="nav-links" id="navLinks">
        <li><a href="index.html"${linkClass('index.html')}${ariaCurrent('index.html')}>HOME</a></li>

        <!-- SERVICES DROPDOWN -->
        <li class="dropdown">
            <a class="dropdown-toggle${toggleClass('services.html')}"
               aria-haspopup="true" aria-expanded="false">
                SERVICES <span class="arrow" aria-hidden="true">&#9662;</span>
            </a>
            <ul class="dropdown-menu" role="menu">
                <li role="none"><a href="master-data.html" role="menuitem">Master Data</a></li>
                <li role="none"><a href="implementation.html" role="menuitem">Implementation</a></li>
                <li role="none"><a href="digital-transformation.html" role="menuitem">Digital Transformation</a></li>
                <li role="none"><a href="interfaces.html" role="menuitem">Interfaces</a></li>
                <li role="none"><a href="csv.html" role="menuitem">Computer System Validation (CSV)</a></li>
                <li role="none"><a href="operational-support.html" role="menuitem">Operational Support</a></li>
            </ul>
        </li>

        <!-- TECHNOLOGIES DROPDOWN -->
        <li class="dropdown">
            <a class="dropdown-toggle${toggleClass('technologies.html')}"
               aria-haspopup="true" aria-expanded="false">
                TECHNOLOGIES <span class="arrow" aria-hidden="true">&#9662;</span>
            </a>
            <ul class="dropdown-menu" role="menu">
                <li role="none"><a href="lims.html" role="menuitem">LIMS</a></li>
                <li role="none"><a href="eln.html" role="menuitem">ELN</a></li>
                <li role="none"><a href="empower.html" role="menuitem">Empower</a></li>
                <li role="none"><a href="nugenesis.html" role="menuitem">NuGenesis (SDMS)</a></li>
                <li role="none"><a href="chromeleon.html" role="menuitem">Chromeleon</a></li>
                <li role="none"><a href="moda.html" role="menuitem">MODA</a></li>
            </ul>
        </li>
        <li><a href="industries.html"${linkClass('industries.html')}${ariaCurrent('industries.html')}>INDUSTRIES</a></li>
        <li><a href="company.html"${linkClass('company.html')}${ariaCurrent('company.html')}>COMPANY</a></li>
        <li><a href="contact.html" class="contact-btn${toggleClass('contact.html')}"${ariaCurrent('contact.html')}>CONTACT US</a></li>
    </ul>

    <button class="hamburger" id="hamburger" type="button"
        aria-label="Toggle navigation" aria-expanded="false" aria-controls="navLinks">
        <span></span>
        <span></span>
        <span></span>
    </button>
</nav>`.trim();
        }

        /* ----------------------------------------------------------
           Wire up all interactivity. Drives the .open / aria-expanded
           states that navbar.css reacts to.
           ---------------------------------------------------------- */
        _setup() {
            var self = this;

            this.hamburger = this.querySelector('#hamburger');
            this.navLinks  = this.querySelector('#navLinks');
            if (!this.hamburger || !this.navLinks) return;

            /* --- Shared backdrop (created once, appended to <body>) --- */
            this.backdrop = document.querySelector('.nav-backdrop');
            if (!this.backdrop) {
                this.backdrop = document.createElement('div');
                this.backdrop.className = 'nav-backdrop';
                document.body.appendChild(this.backdrop);
            }

            /* --- Hamburger: open / close the slide-in panel --- */
            this._onHamburgerClick = function (e) {
                e.stopPropagation();
                self._togglePanel();
            };
            this.hamburger.addEventListener('click', this._onHamburgerClick);

            /* --- Dropdown toggles: accordion on mobile, normal link on desktop.
                   First tap expands; second tap (when already open) navigates. --- */
            this._onToggleClick = function (e) {
                if (!isMobile()) return;                 // desktop: CSS :hover handles it, link navigates
                var toggle  = e.currentTarget;
                var dd      = toggle.closest('.dropdown');
                if (!dd) return;
                var isOpen  = dd.classList.contains('open');

                if (isOpen) return;                      // already open -> let the link navigate

                e.preventDefault();                      // first tap -> expand only

                // close sibling dropdowns
                self.querySelectorAll('.nav-links .dropdown.open').forEach(function (sib) {
                    sib.classList.remove('open');
                    var t = sib.querySelector('.dropdown-toggle');
                    if (t) t.setAttribute('aria-expanded', 'false');
                });
                dd.classList.add('open');
                toggle.setAttribute('aria-expanded', 'true');
            };
            this.querySelectorAll('.nav-links .dropdown-toggle').forEach(function (t) {
                t.addEventListener('click', self._onToggleClick);
            });

            /* --- Any non-toggle link click closes the panel (mobile) --- */
            this._onLinkClick = function () {
                if (isMobile()) self._closeAll();
            };
            this.querySelectorAll('.nav-links a:not(.dropdown-toggle)').forEach(function (a) {
                a.addEventListener('click', self._onLinkClick);
            });

            /* --- Backdrop click closes --- */
            this._onBackdropClick = function () { self._closeAll(); };
            this.backdrop.addEventListener('click', this._onBackdropClick);

            /* --- Click anywhere outside the navbar closes everything --- */
            this._onDocClick = function (e) {
                if (!self.contains(e.target) && !self.backdrop.contains(e.target)) {
                    self._closeAll();
                }
            };
            document.addEventListener('click', this._onDocClick);

            /* --- ESC closes + returns focus to the hamburger --- */
            this._onKey = function (e) {
                if (e.key === 'Escape' && self.navLinks.classList.contains('open')) {
                    self._closeAll();
                    self.hamburger.focus();
                }
            };
            document.addEventListener('keydown', this._onKey);

            /* --- Debounced resize: reset to desktop state when crossing up --- */
            var timer;
            this._onResize = function () {
                clearTimeout(timer);
                timer = setTimeout(function () {
                    if (!isMobile()) self._closeAll();
                }, 150);
            };
            window.addEventListener('resize', this._onResize);
        }

        _togglePanel() {
            if (this.navLinks.classList.contains('open')) this._closeAll();
            else this._openPanel();
        }

        _openPanel() {
            this.navLinks.classList.add('open');
            this.hamburger.setAttribute('aria-expanded', 'true');
            this.backdrop.classList.add('show');
            document.body.classList.add('nav-open');
        }

        _closeAll() {
            if (this.navLinks)  this.navLinks.classList.remove('open');
            if (this.hamburger) this.hamburger.setAttribute('aria-expanded', 'false');
            if (this.backdrop)  this.backdrop.classList.remove('show');
            document.body.classList.remove('nav-open');
            this.querySelectorAll('.nav-links .dropdown.open').forEach(function (dd) {
                dd.classList.remove('open');
                var t = dd.querySelector('.dropdown-toggle');
                if (t) t.setAttribute('aria-expanded', 'false');
            });
        }

        _teardown() {
            // Only the document/window-level listeners can leak; the per-element
            // listeners die with the element. Remove them to be safe.
            if (this._onDocClick)  document.removeEventListener('click', this._onDocClick);
            if (this._onKey)       document.removeEventListener('keydown', this._onKey);
            if (this._onResize)    window.removeEventListener('resize', this._onResize);
            if (this._onBackdropClick && this.backdrop) {
                this.backdrop.removeEventListener('click', this._onBackdropClick);
            }
            document.body.classList.remove('nav-open');
        }
    }

    /* ============================================================
       SITE FOOTER
       ============================================================ */
    class SiteFooter extends HTMLElement {

        connectedCallback() {
            var year = new Date().getFullYear();
            this.innerHTML = this._render(year);
        }

        // Footer has no interactive state, so no disconnectedCallback needed.
        _render(year) {
            return `
<footer class="footer">
    <div class="footer-container">
        <div class="footer-brand">
            <img src="logo.png" alt="AssureInfo Technologies Logo" class="footer-logo" loading="lazy">
            <p>AssureInfo Technologies Pvt. Ltd. is a trusted technology consulting and services company focused on laboratory informatics, digital transformation, and enterprise support solutions.</p>
        </div>
        <div class="footer-column">
            <h3>Quick Links</h3>
            <ul>
                <li><a href="index.html">Home</a></li>
                <li><a href="industries.html">Industries</a></li>
                <li><a href="company.html">Company</a></li>
                <li><a href="contact.html">Contact Us</a></li>
            </ul>
        </div>
        <div class="footer-column">
            <h3>Our Services</h3>
            <ul>
                <li><a href="master-data.html">Master Data</a></li>
                <li><a href="implementation.html">Implementation</a></li>
                <li><a href="digital-transformation.html">Digital Transformation</a></li>
                <li><a href="interfaces.html">Interfaces</a></li>
                <li><a href="csv.html">Computer System Validation (CSV)</a></li>
                <li><a href="operational-support.html">Operational Support</a></li>
            </ul>
        </div>
        <div class="footer-column">
            <h3>Technologies</h3>
            <ul>
                <li><a href="lims.html">LIMS</a></li>
                <li><a href="eln.html">ELN</a></li>
                <li><a href="empower.html">Empower</a></li>
                <li><a href="nugenesis.html">NuGenesis (SDMS)</a></li>
                <li><a href="chromeleon.html">Chromeleon</a></li>
                <li><a href="moda.html">MODA</a></li>
            </ul>
        </div>
        <div class="footer-column footer-contact">
            <h3>Contact Us</h3>
            <p><strong>Email</strong><br><a href="mailto:support@assureinfo.in" style="color: inherit; text-decoration: none;">support@assureinfo.in</a></p>
            <p><strong>Phone</strong><br><a href="tel:+917598232307" style="color: inherit; text-decoration: none;">+91 75982 32307</a></p>
            <p><strong>Location</strong><br>No 104 Srivani Symphony, Bommasandra Industrial Estate, Bangalore, Karnataka - 560099.</p>
        </div>
    </div>
    <div class="footer-bottom">
        <p>&copy; ${year} AssureInfo Technologies Pvt. Ltd. All Rights Reserved.</p>
        <div class="footer-bottom-links">
            <a href="privacy.html">Privacy Policy</a>
            <a href="terms.html">Terms &amp; Conditions</a>
        </div>
    </div>
</footer>`.trim();
        }
    }

    /* --- Register --- */
    customElements.define('site-navbar', SiteNavbar);
    customElements.define('site-footer', SiteFooter);
})();