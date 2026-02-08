const buildTime = import.meta.env.VITE_BUILD_TIME;

export const appVersion = import.meta.env.VITE_APP_VERSION ?? 'dev';

export const buildTimeCst = (() => {
	if (!buildTime) {
		return 'unknown';
	}

	const date = new Date(buildTime);
	if (Number.isNaN(date.getTime())) {
		return 'unknown';
	}

	return new Intl.DateTimeFormat('en-US', {
		timeZone: 'America/Chicago',
		month: 'short',
		day: '2-digit',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	}).format(date);
})();
