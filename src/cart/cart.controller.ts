import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private cart: CartService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.cart.getCart(user.id);
  }

  @Post('items')
  add(@CurrentUser() user: AuthUser, @Body() dto: AddCartItemDto) {
    return this.cart.addItem(user.id, dto);
  }

  @Patch('items/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cart.updateItem(user.id, id, dto);
  }

  @Delete('items/:id')
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.cart.removeItem(user.id, id);
  }

  @Delete()
  async clear(@CurrentUser() user: AuthUser) {
    await this.cart.clearCart(user.id);
  }
}
