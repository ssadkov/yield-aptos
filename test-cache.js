// Тестовый скрипт для проверки кэширования
const API_URL = 'http://localhost:3000'; // Измените на ваш URL

async function testCache() {
  console.log('🧪 Testing cache functionality...\n');
  
  // Тест 1: Первый запрос (должен загрузить данные)
  console.log('📡 Test 1: First request (should load data)');
  const start1 = Date.now();
  const response1 = await fetch(`${API_URL}/api/echelon/markets`);
  const data1 = await response1.json();
  const time1 = Date.now() - start1;
  
  console.log(`⏱️ Response time: ${time1}ms`);
  console.log(`📦 Cache status: ${response1.headers.get('X-Cache-Status')}`);
  console.log(`🔑 Cache key: ${data1.cacheInfo?.key}`);
  console.log(`💾 Cached until: ${data1.cacheInfo?.cachedUntil}`);
  console.log(`📊 Markets count: ${data1.marketData?.length || 0}\n`);
  
  // Ждем 2 секунды
  console.log('⏳ Waiting 2 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Тест 2: Второй запрос (должен использовать кэш)
  console.log('📡 Test 2: Second request (should use cache)');
  const start2 = Date.now();
  const response2 = await fetch(`${API_URL}/api/echelon/markets`);
  const data2 = await response2.json();
  const time2 = Date.now() - start2;
  
  console.log(`⏱️ Response time: ${time2}ms`);
  console.log(`📦 Cache status: ${response2.headers.get('X-Cache-Status')}`);
  console.log(`🔑 Cache key: ${data2.cacheInfo?.key}`);
  console.log(`💾 Cached until: ${data2.cacheInfo?.cachedUntil}`);
  console.log(`📊 Markets count: ${data2.marketData?.length || 0}\n`);
  
  // Анализ результатов
  console.log('📈 Analysis:');
  console.log(`   First request: ${time1}ms`);
  console.log(`   Second request: ${time2}ms`);
  console.log(`   Speed improvement: ${Math.round((time1 - time2) / time1 * 100)}%`);
  
  if (time2 < time1 * 0.5) {
    console.log('✅ Cache is working! Second request was much faster.');
  } else {
    console.log('⚠️ Cache might not be working properly.');
  }
  
  // Проверяем, что данные одинаковые
  if (JSON.stringify(data1.marketData) === JSON.stringify(data2.marketData)) {
    console.log('✅ Data consistency: OK');
  } else {
    console.log('⚠️ Data consistency: Different data returned');
  }
}

// Запускаем тест
testCache().catch(console.error); 