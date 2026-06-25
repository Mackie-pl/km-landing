// Landing page logic: pull the latest GitHub Release and render per-platform
// download links. Pure client-side — no build step, no rebuild on new versions.
// A new tag in the app repo automatically shows up here on next page load.

const CONFIG = {
	// owner/repo that publishes the app releases
	repo: 'Mackie-pl/km',
	// Where the web app lives (the Pages subdomain). Edit to match your DNS.
	appUrl: 'https://app.example.com',
};

const $ = (id) => document.getElementById(id);

// Wire up the static links that don't depend on the API.
$('open-app').href = CONFIG.appUrl;
$('releases-link').href = `https://github.com/${CONFIG.repo}/releases`;

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

async function load() {
	try {
		const res = await fetch(
			`https://api.github.com/repos/${CONFIG.repo}/releases/latest`,
			{ headers: { Accept: 'application/vnd.github+json' } },
		);
		if (!res.ok) throw new Error(`GitHub API ${res.status}`);
		const release = await res.json();

		const version = release.tag_name ?? '';
		$('release-meta').textContent =
			`${version} · ${fmtDate(release.published_at)}`;
		$('version-foot').textContent = version
			? `Latest release ${version}`
			: '';

		const items = (release.assets ?? [])
			.map((a) => {
				const c = classify(a.name);
				return c
					? { ...c, name: a.name, url: a.browser_download_url }
					: null;
			})
			.filter(Boolean)
			.sort((a, b) => a.sort - b.sort);

		if (items.length === 0) {
			$('error').textContent =
				'No downloadable builds in the latest release yet.';
			$('error').hidden = false;
			return;
		}

		// Recommended pick for the detected OS.
		const myOS = detectOS();
		const pick = items.find((i) => i.os === myOS);
		if (pick) {
			$('primary').hidden = false;
			$('primary').innerHTML = `
				<a href="${pick.url}">
					<span>Download for ${pick.label}</span>
					<span class="sub">${pick.name}</span>
				</a>`;
		}

		// Full grid.
		$('all-downloads').innerHTML = items
			.map(
				(i) => `
				<li>
					<a href="${i.url}">
						<span class="platform">${i.label}</span>
						<span class="file">${i.name}</span>
					</a>
				</li>`,
			)
			.join('');
	} catch (err) {
		$('release-meta').textContent = '';
		$('error').textContent = `Couldn't load releases (${err.message}). See GitHub Releases.`;
		$('error').hidden = false;
	}
}

load();
