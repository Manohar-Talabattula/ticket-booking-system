import { Test, TestingModule } from '@nestjs/testing';
import { SeatHoldService } from './seat-hold.service';

describe('SeatHoldService', () => {
  let service: SeatHoldService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SeatHoldService],
    }).compile();

    service = module.get<SeatHoldService>(SeatHoldService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
