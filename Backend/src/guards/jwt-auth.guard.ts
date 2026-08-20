import { Injectable } from '@nestjs/common';
import { AuthenticationGuard } from './authentication.guard';

@Injectable()
export class JwtAuthGuard extends AuthenticationGuard {}
