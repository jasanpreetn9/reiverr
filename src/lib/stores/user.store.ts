import { derived, get, writable } from 'svelte/store';
import { getReiverrApiNew, reiverrApi, type ReiverrUser } from '../apis/reiverr/reiverr-api';
import axios from 'axios';
import type { operations } from '../apis/reiverr/reiverr.generated';
import { type Session, sessions } from './session.store';
import type { SourcePluginCapabilitiesDto, MediaSource } from '../apis/reiverr/reiverr.openapi';

export let reiverrApiNew: ReturnType<typeof getReiverrApiNew>;

function useUser() {
	const activeSession = derived(sessions, (sessions) => sessions.activeSession);

	const initializedStores = writable({ user: false, sources: false });
	const userStore = writable<ReiverrUser | undefined | null>(undefined);
	const sources = writable<{ source: MediaSource; capabilities: SourcePluginCapabilitiesDto }[]>(
		[]
	);
	const isAppInitialized = derived(initializedStores, ({ user, sources }) => user && sources);

	let lastActiveSession: Session | undefined;
	activeSession.subscribe(async (activeSession) => {
		initializedStores.set({ user: false, sources: false });
		await refreshUser(activeSession);
	});

	userStore.subscribe(async (user) => {
		if (!user) {
			sources.set([]);
			initializedStores.update((i) => ({ ...i, sources: i.user }));
			return;
		}

		const out: { source: MediaSource; capabilities: SourcePluginCapabilitiesDto }[] = [];

		await Promise.all(
			user?.mediaSources
				?.filter((s) => s.enabled)
				?.map(async (s) => {
					out.push({
						source: s,
						capabilities: await reiverrApiNew.sources
							.getSourceCapabilities(s.id, s.pluginSettings ?? ({} as any))
							.then((r) => r.data)
					});
				}) ?? []
		);

		sources.set(out);
		initializedStores.update((i) => ({ ...i, sources: i.user }));
	});

	async function updateUser(updateFn: (user: ReiverrUser) => ReiverrUser) {
		const user = get(userStore);

		if (!user) return;

		const updated = updateFn(user);
		const { user: update, error } = await reiverrApi.updateUser(updated.id, updated);

		if (update) {
			initializedStores.update((i) => ({ ...i, user: true }));
			userStore.set(update);
		}

		return error;
	}

	async function refreshUser(activeSession = get(sessions)?.activeSession) {
		if (!activeSession) {
			initializedStores.update((i) => ({ ...i, user: true }));
			userStore.set(null);
			return;
		}

		userStore.set(undefined);
		lastActiveSession = activeSession;
		const user = await axios
			.get<
				operations['UsersController_findById']['responses']['200']['content']['application/json']
			>(activeSession.baseUrl + '/api/users/' + activeSession.id, {
				headers: {
					Authorization: 'Bearer ' + activeSession.token
				}
			})
			.then((r) => r.data)
			.catch(() => null);

		if (lastActiveSession === activeSession) {
			initializedStores.update((i) => ({ ...i, user: true }));
			reiverrApiNew = getReiverrApiNew();
			userStore.set(user);
		}
	}

	// initializedStores.subscribe((i) => console.log('initializedStores', i));

	return {
		user: {
			subscribe: userStore.subscribe,
			updateUser,
			refreshUser
		},
		sources: {
			subscribe: sources.subscribe
		},
		isAppInitialized: {
			subscribe: isAppInitialized.subscribe
		}
	};
}

export const { user, sources, isAppInitialized } = useUser();
// isAppInitialized.subscribe((i) => console.log('isAppInitialized', i));
