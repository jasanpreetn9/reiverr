import { derived, get, writable } from 'svelte/store';
import { getReiverrApiNew, reiverrApi, type ReiverrUser } from '../apis/reiverr/reiverr-api';
import axios from 'axios';
import type { operations } from '../apis/reiverr/reiverr.generated';
import { type Session, sessions } from './session.store';

export let reiverrApiNew: ReturnType<typeof getReiverrApiNew>;

function useUser() {
	const activeSession = derived(sessions, (sessions) => sessions.activeSession);

	const userStore = writable<ReiverrUser | undefined | null>(undefined);

	let lastActiveSession: Session | undefined;
	activeSession.subscribe(async (activeSession) => {
		refreshUser(activeSession);
		reiverrApiNew = getReiverrApiNew();
	});

	async function updateUser(updateFn: (user: ReiverrUser) => ReiverrUser) {
		const user = get(userStore);

		if (!user) return;

		const updated = updateFn(user);
		const { user: update, error } = await reiverrApi.updateUser(updated.id, updated);

		if (update) {
			userStore.set(update);
		}

		return error;
	}

	async function refreshUser(activeSession = get(sessions)?.activeSession) {
		if (!activeSession) {
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

		if (lastActiveSession === activeSession) userStore.set(user);
	}

	return {
		subscribe: userStore.subscribe,
		updateUser,
		refreshUser
	};
}

export const user = useUser();
