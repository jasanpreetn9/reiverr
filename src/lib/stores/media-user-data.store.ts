import type { TmdbSeries2 } from '$lib/apis/tmdb/tmdb-api';
import { createModal } from '$lib/components/Modal/modal.store';
import { createErrorNotification } from '$lib/components/Notifications/notification.store';
import { playerState } from '$lib/components/VideoPlayer/VideoPlayer';
import StreamSelectorModal from '$lib/pages/TitlePages/StreamSelectorModal.svelte';
import { derived, get, writable, type Readable } from 'svelte/store';
import type {
	MediaSource,
	MovieUserDataDto,
	SeriesUserDataDto,
	StreamCandidateDto
} from '../apis/reiverr/reiverr.openapi';
import type { MediaType } from '../types';
import { reiverrApiNew, sources, user } from './user.store';
import {
	episodeUserDataStore,
	movieUserDataStore,
	seriesUserDataStore,
	tmdbMovieDataStore,
	tmdbSeriesDataStore
} from './data.store';

export type EpisodeData = {
	season: number;
	episode: number;
	watched: boolean;
	progress: number;
};

async function getStreams(
	tmdbId: string,
	season?: number,
	episode?: number
): Promise<{ source: MediaSource; streams: StreamCandidateDto[] }[]> {
	return Promise.all(
		get(sources).map(async (source) => {
			return {
				source: source.source,
				streams: await (season !== undefined && episode !== undefined
					? reiverrApiNew.sources
							.getEpisodeStreams(source.source.id, tmdbId, season, episode)
							.then((r) => r.data?.candidates ?? [])
							.catch((e) => [])
					: reiverrApiNew.sources
							.getMovieStreams(source.source.id, tmdbId)
							.then((r) => r.data?.candidates ?? [])
							.catch((e) => []))
			};
		})
	);
}

async function handleAutoplay(options: {
	tmdbId: string;
	season?: number;
	episode?: number;
	progress?: number;
}) {
	const { tmdbId, season, episode, progress } = options;

	const awaitedStreams = await getStreams(tmdbId, season, episode);

	const firstSource = awaitedStreams.find((p) => p.streams.length > 0);
	const sourceId = firstSource?.source.id;
	const key = firstSource?.streams[0]?.key;

	if (season !== undefined && episode !== undefined) {
		playerState.streamEpisode(tmdbId, season, episode, {
			progress,
			sourceId,
			key
		});
	}
}

async function handleOpenStreamSelector(options: {
	tmdbId: string;
	season?: number;
	episode?: number;
	progress?: number;
}) {
	const { tmdbId, season, episode, progress } = options;

	createModal(StreamSelectorModal, {
		getStreams: (s) =>
			getStreams(tmdbId, season, episode).then((r) => r.find((p) => p.source === s)?.streams ?? []),
		selectStream: (source, stream) =>
			playerState.streamTmdbItem({
				tmdbId,
				season,
				episode,
				progress,
				key: stream.key,
				sourceId: source.id
			})
	});
}

function useUserLibrary(
	mediaType: MediaType,
	tmdbId: string,
	userDataP: Readable<MovieUserDataDto | SeriesUserDataDto | undefined>
) {
	const inLibrary = writable<boolean>(undefined);

	userDataP.subscribe((d) => {
		inLibrary.set(d?.inLibrary ?? false);
	});

	async function handleAddToLibrary() {
		const userId = get(user)?.id;

		if (!userId) {
			console.error('Add to library: No user ID');
			return;
		}

		const success = await reiverrApiNew.users
			.addLibraryItem(userId, tmdbId, { mediaType })
			.then((r) => r.data.success);
		if (success) inLibrary.set(true);
	}

	async function handleRemoveFromLibrary() {
		const userId = get(user)?.id;

		if (!userId) {
			console.error('Remove from library: No user ID');
			return;
		}

		const success = await reiverrApiNew.users
			.removeLibraryItem(userId, tmdbId)
			.then((r) => r.data.success);
		if (success) inLibrary.set(false);
	}

	return {
		inLibrary,
		handleAddToLibrary,
		handleRemoveFromLibrary
	};
}

function useIsWatched(
	userData: Readable<MovieUserDataDto | undefined>,
	toggleFn: (userId: string, watched: boolean) => Promise<any>
) {
	const isWatched = writable<boolean>(undefined);

	userData.subscribe((d) => {
		isWatched.set(d?.playState?.watched ?? false);
	});

	async function toggleIsWatched() {
		const watched = get(isWatched);
		const userId = get(user)?.id;

		if (!userId) {
			return;
		}

		return toggleFn(userId, !watched).finally(() => {
			isWatched.set(!watched);
		});
	}

	return {
		isWatched,
		toggleIsWatched
	};
}

function useCanStream() {
	const canStream = writable(true);

	return {
		canStream
	};
}

export function useSeriesUserData(tmdbId: string) {
	const userDataRequest = seriesUserDataStore.getRequest(tmdbId);
	const tmdbSeriesRequest = tmdbSeriesDataStore.getRequest(Number(tmdbId));
	const libraryStore = useUserLibrary('Series', tmdbId, userDataRequest);
	const canStreamStore = useCanStream();
	const episodesUserData = writable<EpisodeData[]>([]);
	const nextEpisode = writable<EpisodeData>({
		season: 1,
		episode: 1,
		progress: 0,
		watched: false
	});

	derived([userDataRequest, tmdbSeriesRequest], (_) => _).subscribe(([userData, tmdbSeries]) => {
		if (!tmdbSeries) return;

		const episodesData: EpisodeData[] = [];
		let foundNext = false;
		for (let season = 1; season <= (tmdbSeries.number_of_seasons ?? 0); season++) {
			for (
				let episode = 1;
				episode <= (tmdbSeries.seasons?.[season - 1]?.episode_count ?? 0);
				episode++
			) {
				const ep = userData?.playStates?.find((p) => p.season === season && p.episode === episode);
				if (!foundNext && !ep?.watched) {
					nextEpisode.set({
						season,
						episode,
						progress: ep?.progress ?? 0,
						watched: ep?.watched ?? false
					});
					foundNext = true;
				}
				episodesData.push({
					season,
					episode,
					watched: ep?.watched ?? false,
					progress: ep?.progress ?? 0
				});
			}
		}
		episodesUserData.set(episodesData);
	});

	return {
		...libraryStore,
		...canStreamStore,
		nextEpisode,
		episodesUserData,
		handleAutoplay: async () => {
			const { season, episode, progress } = get(nextEpisode) ?? {};

			if (season === undefined || episode === undefined) {
				createErrorNotification('Could not find next episode');
				return;
			}

			return handleAutoplay({ tmdbId, season, episode, progress });
		},
		handleOpenStreamSelector: async () => {
			const { season, episode, progress } = get(nextEpisode) ?? {};

			if (season === undefined || episode === undefined) {
				createErrorNotification('Could not find next episode');
				return;
			}

			return handleOpenStreamSelector({ tmdbId, season, episode, progress });
		},
		unsubscribe: () => {
			userDataRequest.unsubscribe();
			tmdbSeriesRequest.unsubscribe();
		}
	};
}

export function useMovieUserData(tmdbId: string) {
	const userData = movieUserDataStore.getRequest(tmdbId);
	const libraryStore = useUserLibrary('Movie', tmdbId, userData);
	const canStreamStore = useCanStream();
	const isWatchedStore = useIsWatched(userData, (userId, watched) =>
		reiverrApiNew.users.updateMoviePlayStateByTmdbId(userId, tmdbId, {
			watched
		})
	);
	const progress = derived(userData, ($userData) => $userData?.playState?.progress ?? 0);

	return {
		...libraryStore,
		...canStreamStore,
		...isWatchedStore,
		progress,
		handleAutoplay: async () => handleAutoplay({ tmdbId, progress: get(progress) }),
		handleOpenStreamSelector: async () =>
			handleOpenStreamSelector({ tmdbId, progress: get(progress) }),
		unsubscribe: () => userData.unsubscribe()
	};
}

export function useEpisodeUserData(tmdbId: string, season: number, episode: number) {
	const userData = episodeUserDataStore.getRequest(tmdbId, season, episode);
	const canStreamStore = useCanStream();
	const isWatchedStore = useIsWatched(userData, (userId, watched) =>
		reiverrApiNew.users
			.updateEpisodePlayStateByTmdbId(userId, tmdbId, season, episode, {
				watched
			})
			.finally(() => seriesUserDataStore.refresh(tmdbId))
	);
	const progress = derived(userData, ($userData) => $userData?.playState?.progress ?? 0);

	return {
		...canStreamStore,
		...isWatchedStore,
		progress,
		handleAutoplay: async () =>
			handleAutoplay({ tmdbId, season, episode, progress: get(progress) }),
		handleOpenStreamSelector: async () =>
			handleOpenStreamSelector({ tmdbId, season, episode, progress: get(progress) }),
		unsubscribe: () => userData.unsubscribe()
	};
}
