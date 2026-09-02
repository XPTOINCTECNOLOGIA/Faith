import { Controller, Get, Param, ParseBoolPipe, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators';
import type { RequestUser } from '../auth/identity.service';
import { NotificationsService } from './notifications.service';

@ApiTags('notificações')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('unread', new ParseBoolPipe({ optional: true })) unread?: boolean,
  ) {
    return this.service.listMine(user.id, unread === true);
  }

  @Patch('read-all')
  markAll(@CurrentUser() user: RequestUser) {
    return this.service.markAllRead(user.id);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: RequestUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.markRead(user.id, id);
  }
}
