// Landing page logic: pull the latest GitHub Release and render per-platform
// download links. Pure client-side — no build step, no rebuild on new versions.
// A new tag in the app repo automatically shows up here on next page load.

const CONFIG = {
	// owner/repo that publishes the app releases
	repo: 'Mackie-pl/km',
	// Where the web app lives (the Pages subdomain).
	appUrl: 'https://app.dotta.space',
};

const $ = (id) => document.getElementById(id);

// Wire up the static links that don't depend on the API.
const releasesUrl = `https://github.com/${CONFIG.repo}/releases`;
for (const id of [
	'open-app-nav',
	'open-app-menu',
	'open-app-hero',
	'open-app-download',
	'open-app-foot',
]) {
	$(id).href = CONFIG.appUrl;
}
$('releases-link').href = releasesUrl;
$('github-link').href = releasesUrl;

/** Mobile nav: the hamburger drives both the panel and its own animation. */
const menuToggle = $('menu-toggle');
const mobileMenu = $('mobile-menu');

menuToggle.addEventListener('click', () => {
	const open = menuToggle.getAttribute('aria-expanded') === 'true';
	menuToggle.setAttribute('aria-expanded', String(!open));
	mobileMenu.hidden = open;
});

// Any tap inside the panel navigates, so close behind it.
mobileMenu.addEventListener('click', (e) => {
	if (e.target.closest('a[href^="#"]')) {
		menuToggle.setAttribute('aria-expanded', 'false');
		mobileMenu.hidden = true;
	}
});

// Resizing past the breakpoint leaves the panel stranded open otherwise.
const desktop = window.matchMedia('(min-width: 760px)');
desktop.addEventListener('change', (e) => {
	if (e.matches) {
		menuToggle.setAttribute('aria-expanded', 'false');
		mobileMenu.hidden = true;
	}
});

/** Asset names come from the GitHub API — never inject them raw. */
function esc(s) {
	return String(s).replace(
		/[&<>"']/g,
		(c) =>
			({
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#39;',
			})[c],
	);
}

/**
 * Classify a release asset by filename into a platform bucket.
 * Returns null for assets we don't surface (updater sigs, tarballs, etc.).
 */
function classify(name) {
	const n = name.toLowerCase();
	if (/\.(sig|json)$/.test(n)) return null;
	if (/\.tar\.gz$/.test(n)) return null; // updater payloads

	if (/\.apk$/.test(n)) return { os: 'android', label: 'Android', sort: 10 };
	if (/\.(msi|exe)$/.test(n)) return { os: 'windows', label: 'Windows', sort: 20 };
	if (/\.dmg$/.test(n)) {
		if (/(aarch64|arm64)/.test(n))
			return { os: 'mac', label: 'macOS (Apple Silicon)', sort: 30 };
		if (/(x64|x86_64|intel)/.test(n))
			return { os: 'mac', label: 'macOS (Intel)', sort: 31 };
		return { os: 'mac', label: 'macOS', sort: 32 };
	}
	if (/\.appimage$/.test(n))
		return { os: 'linux', label: 'Linux (AppImage)', sort: 40 };
	if (/\.deb$/.test(n)) return { os: 'linux', label: 'Linux (.deb)', sort: 41 };
	if (/\.rpm$/.test(n)) return { os: 'linux', label: 'Linux (.rpm)', sort: 42 };
	return null;
}

/** Card titles stay generic; the richer `label` carries the arch/format. */
const OS_LABELS = {
	windows: 'Windows',
	mac: 'macOS',
	linux: 'Linux',
	android: 'Android',
};

/** Best guess at the visitor's OS, to highlight a recommended download. */
function detectOS() {
	const ua = navigator.userAgent;
	if (/android/i.test(ua)) return 'android';
	if (/iphone|ipad|ipod/i.test(ua)) return 'mac'; // no iOS build; closest is mac
	if (/win/i.test(ua)) return 'windows';
	if (/mac/i.test(ua)) return 'mac';
	if (/linux/i.test(ua)) return 'linux';
	return null;
}

function fmtDate(iso) {
	try {
		return new Date(iso).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	} catch {
		return '';
	}
}

function showError(msg) {
	$('error').textContent = msg;
	$('error').hidden = false;
}

async function load() {
	try {
		const res = await fetch(
			`https://api.github.com/repos/${CONFIG.repo}/releases/latest`,
			{ headers: { Accept: 'application/vnd.github+json' } },
		);
		if (!res.ok) throw new Error(`GitHub API ${res.status}`);
		const release = await res.json();

		const version = release.tag_name ?? '';
		const tag = version ? `v${version.replace(/^v/, '')}` : '';
		$('release-meta').textContent = version
			? `${version} · ${fmtDate(release.published_at)}`
			: '';
		$('version-foot').textContent = tag;

		// Version chips stay hidden until there's a real tag to show.
		if (tag) {
			for (const id of ['version-nav', 'version-menu']) {
				$(id).textContent = tag;
				$(id).hidden = false;
			}
			$('version-nav').title = `Latest release ${tag} — jump to downloads`;
		}

		const items = (release.assets ?? [])
			.map((a) => {
				const c = classify(a.name);
				return c ? { ...c, name: a.name, url: a.browser_download_url } : null;
			})
			.filter(Boolean)
			.sort((a, b) => a.sort - b.sort);

		if (items.length === 0) {
			showError('No downloadable builds in the latest release yet.');
			return;
		}

		// One card per OS — the sort above puts the preferred build first.
		const byOS = new Map();
		for (const item of items) {
			if (!byOS.has(item.os)) byOS.set(item.os, item);
		}
		const platforms = [...byOS.values()];

		// Recommended pick for the detected OS.
		const pick = byOS.get(detectOS());
		if (pick) {
			$('primary').hidden = false;
			$('primary').innerHTML = `
				<a href="${esc(pick.url)}">
					<span class="label">Download for ${esc(pick.label)}</span>
					<span class="sub">${esc(pick.name)}</span>
				</a>`;
		}

		$('all-downloads').innerHTML = platforms
			.map(
				(p) => `
				<div class="card platform-card">
					<div class="platform-icon"></div>
					<div class="platform-name">${esc(OS_LABELS[p.os] ?? p.label)}</div>
					<div class="platform-file" title="${esc(p.name)}">${esc(p.name)}</div>
					<a class="btn btn-ghost btn-sm" href="${esc(p.url)}">Download</a>
				</div>`,
			)
			.join('');
	} catch (err) {
		$('release-meta').textContent = '';
		showError(`Couldn't load releases (${err.message}). See GitHub Releases.`);
	}
}

load();
