import { NextResponse } from 'next/server';
import { LendingService } from '@aptin/interface-sdk-js';

const USER_WALLET = '0xc9eceb24a8e6cb1065a150587e6ccd604fcc644b73513184309d8f47ceca925a'; // Кошелек пользователя

export async function GET() {
  try {
    const lendingService = new LendingService(USER_WALLET);
 
    // Получаем данные о пулах
    const pools = await lendingService.getPoolInfos();

    console.log('Raw pool data:', JSON.stringify(pools, null, 2)); // Логируем ответ в консоль в читаемом виде

    return NextResponse.json({ success: true, rawPools: pools });
  } catch (error) {
    console.error('Error fetching Aptin pools:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
