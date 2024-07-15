/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */


export interface paths {
  "/users": {
    get: operations["UsersController_findAll"];
    post: operations["UsersController_create"];
  };
  "/users/{id}": {
    get: operations["UsersController_findById"];
    put: operations["UsersController_update"];
    delete: operations["UsersController_deleteUser"];
  };
  "/auth": {
    post: operations["AuthController_signIn"];
  };
  "/my-list": {
    get: operations["MyListController_getMyList"];
  };
  "/my-list/{tmdbId}": {
    post: operations["MyListController_addToMyList"];
    delete: operations["MyListController_removeFromMyList"];
  };
  "/play-state/{tmdbId}": {
    get: operations["PlayStateController_getPlayState"];
    put: operations["PlayStateController_updatePlayState"];
  };
  "/play-state/{tmdbId}/season/{seasonNumber}/episode/{episodeNumber}": {
    get: operations["PlayStateController_getEpisodePlayState"];
    put: operations["PlayStateController_updateEpisodePlayState"];
  };
  "/": {
    get: operations["AppController_getHello"];
  };
}

export type webhooks = Record<string, never>;

export interface components {
  schemas: {
    SonarrSettings: {
      apiKey: string;
      baseUrl: string;
      qualityProfileId: number;
      rootFolderPath: string;
      languageProfileId: number;
    };
    RadarrSettings: {
      apiKey: string;
      baseUrl: string;
      qualityProfileId: number;
      rootFolderPath: string;
    };
    JellyfinSettings: {
      apiKey: string;
      baseUrl: string;
      userId: string;
    };
    PeerflixSettings: {
      baseUrl: string;
    };
    TmdbSettings: {
      sessionId: string;
      userId: string;
    };
    Settings: {
      autoplayTrailers: boolean;
      language: string;
      animationDuration: number;
      sonarr: components["schemas"]["SonarrSettings"];
      radarr: components["schemas"]["RadarrSettings"];
      jellyfin: components["schemas"]["JellyfinSettings"];
      peerflix: components["schemas"]["PeerflixSettings"];
      tmdb: components["schemas"]["TmdbSettings"];
    };
    UserDto: {
      id: string;
      name: string;
      isAdmin: boolean;
      onboardingDone?: boolean;
      settings: components["schemas"]["Settings"];
      profilePicture: string;
    };
    CreateUserDto: {
      name: string;
      password: string;
      isAdmin: boolean;
      profilePicture?: string;
    };
    UpdateUserDto: {
      name?: string;
      password?: string;
      isAdmin?: boolean;
      onboardingDone?: boolean;
      settings?: components["schemas"]["Settings"];
      profilePicture?: string;
      oldPassword?: string;
    };
    SignInDto: {
      name: string;
      password: string;
    };
    SignInResponse: {
      accessToken: string;
      user: components["schemas"]["UserDto"];
    };
    MyListItemDto: {
      id: string;
      tmdbId: number;
    };
    PlayStateDto: {
      id: string;
      tmdbId: number;
      seasonNumber?: number;
      episodeNumber?: number;
      progress: number;
      watched?: boolean;
      showInUpNext?: boolean;
    };
    UpdatePlayStateDto: {
      progress?: number;
      watched?: boolean;
      showInUpNext?: boolean;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export type $defs = Record<string, never>;

export type external = Record<string, never>;

export interface operations {

  UsersController_findAll: {
    responses: {
      /** @description All users found */
      200: {
        content: {
          "application/json": components["schemas"]["UserDto"][];
        };
      };
    };
  };
  UsersController_create: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateUserDto"];
      };
    };
    responses: {
      /** @description User created */
      200: {
        content: {
          "application/json": components["schemas"]["UserDto"];
        };
      };
      400: {
        content: {
          "application/json": {
            /** @example 400 */
            statusCode: number;
            /** @example Bad Request */
            message: string;
            /** @example Bad Request */
            error?: string;
          };
        };
      };
      401: {
        content: {
          "application/json": {
            /** @example 401 */
            statusCode: number;
            /** @example Unauthorized */
            message: string;
            /** @example Unauthorized */
            error?: string;
          };
        };
      };
    };
  };
  UsersController_findById: {
    parameters: {
      path: {
        id: string;
      };
    };
    responses: {
      /** @description User found */
      200: {
        content: {
          "application/json": components["schemas"]["UserDto"];
        };
      };
      404: {
        content: {
          "application/json": {
            /** @example 404 */
            statusCode: number;
            /** @example Not Found */
            message: string;
            /** @example Not Found */
            error?: string;
          };
        };
      };
    };
  };
  UsersController_update: {
    parameters: {
      path: {
        id: string;
      };
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdateUserDto"];
      };
    };
    responses: {
      /** @description User updated */
      200: {
        content: {
          "application/json": components["schemas"]["UserDto"];
        };
      };
      404: {
        content: {
          "application/json": {
            /** @example 404 */
            statusCode: number;
            /** @example Not Found */
            message: string;
            /** @example Not Found */
            error?: string;
          };
        };
      };
    };
  };
  UsersController_deleteUser: {
    parameters: {
      path: {
        id: string;
      };
    };
    responses: {
      /** @description User deleted */
      200: {
        content: never;
      };
      404: {
        content: {
          "application/json": {
            /** @example 404 */
            statusCode: number;
            /** @example Not Found */
            message: string;
            /** @example Not Found */
            error?: string;
          };
        };
      };
    };
  };
  AuthController_signIn: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["SignInDto"];
      };
    };
    responses: {
      /** @description User found */
      200: {
        content: {
          "application/json": components["schemas"]["SignInResponse"];
        };
      };
      401: {
        content: {
          "application/json": {
            /** @example 401 */
            statusCode: number;
            /** @example Unauthorized */
            message: string;
            /** @example Unauthorized */
            error?: string;
          };
        };
      };
    };
  };
  MyListController_getMyList: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["MyListItemDto"][];
        };
      };
    };
  };
  MyListController_addToMyList: {
    parameters: {
      path: {
        tmdbId: number;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["MyListItemDto"][];
        };
      };
    };
  };
  MyListController_removeFromMyList: {
    parameters: {
      path: {
        tmdbId: number;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["MyListItemDto"][];
        };
      };
    };
  };
  PlayStateController_getPlayState: {
    parameters: {
      path: {
        tmdbId: number;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["PlayStateDto"];
        };
      };
    };
  };
  PlayStateController_updatePlayState: {
    parameters: {
      path: {
        tmdbId: number;
      };
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdatePlayStateDto"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["PlayStateDto"];
        };
      };
    };
  };
  PlayStateController_getEpisodePlayState: {
    parameters: {
      path: {
        tmdbId: number;
        seasonNumber: number;
        episodeNumber: number;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["PlayStateDto"];
        };
      };
    };
  };
  PlayStateController_updateEpisodePlayState: {
    parameters: {
      path: {
        tmdbId: number;
        seasonNumber: number;
        episodeNumber: number;
      };
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdatePlayStateDto"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["PlayStateDto"];
        };
      };
    };
  };
  AppController_getHello: {
    responses: {
      200: {
        content: never;
      };
    };
  };
}
