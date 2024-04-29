/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />
declare let self: ServiceWorkerGlobalScope;

import { build, files, version } from '$service-worker';

const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files];

self.addEventListener('install', (event) => {
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}
	event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
	async function delete0ldCaches() {
		for (const key of await caches.keys()) {
			if (key != CACHE) {
				await caches.delete(key);
			}
		}
	}
	event.waitUntil(delete0ldCaches());
});
