import {
  All,
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SourcePluginsService } from './source-plugins.service';
import { AuthGuard, GetAuthToken, GetUser } from 'src/auth/auth.guard';
import { Request, Response } from 'express';
import { Readable } from 'stream';
import { User } from 'src/users/user.entity';
import { UserSourcesService } from 'src/users/user-sources/user-sources.service';
import { PluginSettingsTemplate } from 'plugins/plugin-types';
import {
  PlaybackConfigDto,
  PluginSettingsDto,
  PluginSettingsTemplateDto,
  SourceListDto as VideoStreamListDto,
  ValidationResponsekDto as ValidationResponseDto,
  VideoStreamDto,
} from './source-plugins.dto';

export const JELLYFIN_DEVICE_ID = 'Reiverr Client';

@Controller()
@UseGuards(AuthGuard)
export class SourcesController {
  constructor(
    private sourcesService: SourcePluginsService,
    private userSourcesService: UserSourcesService,
  ) {}

  @ApiTags('sources')
  @Get('sources')
  @ApiOkResponse({
    description: 'All source plugins found',
    type: String,
    isArray: true,
  })
  async getSourcePlugins() {
    return this.sourcesService
      .getPlugins()
      .then((plugins) => Object.keys(plugins));
  }

  @ApiTags('sources')
  @Get('sources/:sourceId/settings/template')
  @ApiOkResponse({
    description: 'Source settings template',
    type: PluginSettingsTemplateDto,
  })
  async getSourceSettingsTemplate(
    @Param('sourceId') sourceId: string,
    @GetUser() callerUser: User,
  ): Promise<PluginSettingsTemplateDto> {
    const plugin = this.sourcesService.getPlugin(sourceId);

    if (!plugin) {
      throw new NotFoundException('Plugin not found');
    }

    // return plugin.getSettingsTemplate(callerUser.pluginSettings?.[sourceId]);
    return {
      settings: plugin.getSettingsTemplate(),
    };
  }

  @ApiTags('sources')
  @Post('sources/:sourceId/settings/validate')
  @ApiOkResponse({
    description: 'Source settings validation',
    type: ValidationResponseDto,
  })
  async validateSourceSettings(
    @GetUser() callerUser: User,
    @Param('sourceId') sourceId: string,
    @Body() settings: PluginSettingsDto,
  ): Promise<ValidationResponseDto> {
    const plugin = this.sourcesService.getPlugin(sourceId);

    if (!plugin) {
      throw new NotFoundException('Plugin not found');
    }

    return plugin.validateSettings(settings.settings);
  }

  @ApiTags('movies')
  @Get('movies/:tmdbId/sources')
  @ApiOkResponse({
    description: 'Movie sources',
    type: VideoStreamListDto,
  })
  async getMovieSources(
    @Param('tmdbId') tmdbId: string,
    @GetUser() user: User,
    @GetAuthToken() token: string,
  ): Promise<VideoStreamListDto> {
    if (!user) {
      throw new UnauthorizedException();
    }

    const plugins = await this.sourcesService.getPlugins();
    const sources: VideoStreamListDto['sources'] = {};

    for (const pluginId in plugins) {
      const plugin = plugins[pluginId];

      if (!plugin) continue;

      const settings = this.userSourcesService.getSourceSettings(
        user,
        pluginId,
      );

      if (!settings) continue;

      const videoStream = await plugin.getMovieStream(tmdbId, {
        settings,
        token,
      });

      if (!videoStream) continue;

      sources[pluginId] = videoStream;
    }

    return {
      sources,
    };
  }

  @ApiTags('movies')
  @Post('movies/:tmdbId/sources/:sourceId/stream')
  @ApiOkResponse({
    description: 'Movie stream',
    type: VideoStreamDto,
  })
  async getMovieStream(
    @Param('sourceId') sourceId: string,
    @Param('tmdbId') tmdbId: string,
    @GetUser() user: User,
    @GetAuthToken() token: string,
    @Body() config: PlaybackConfigDto,
  ): Promise<VideoStreamDto> {
    if (!user) {
      throw new UnauthorizedException();
    }

    const settings = this.userSourcesService.getSourceSettings(user, sourceId);

    if (!settings) {
      throw new BadRequestException('Source configuration not found');
    }

    return this.sourcesService.getPlugin(sourceId)?.getMovieStream(
      tmdbId,
      {
        settings,
        token,
      },
      config,
    );
  }

  @ApiTags('movies')
  @All('movies/:tmdbId/sources/:sourceId/stream/*')
  async getMovieStreamProxy(
    @Param() params: any,
    @Req() req: Request,
    @Res() res: Response,
    @GetUser() user: User,
  ) {
    const sourceId = params.sourceId;
    const settings = this.userSourcesService.getSourceSettings(user, sourceId);

    if (!settings) throw new UnauthorizedException();

    const { url, headers } = this.sourcesService
      .getPlugin(sourceId)
      ?.handleProxy(
        {
          uri: params[0] + '?' + req.url.split('?')[1],
          headers: req.headers,
        },
        settings,
      );

    const proxyRes = await fetch(url, {
      method: req.method || 'GET',
      headers: {
        ...headers,
        // Authorization: `MediaBrowser DeviceId="${JELLYFIN_DEVICE_ID}", Token="${settings.apiKey}"`,
      },
    });

    Readable.from(proxyRes.body).pipe(res);
    res.status(proxyRes.status);
  }
}
