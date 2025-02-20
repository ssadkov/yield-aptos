import { NextResponse } from "next/server";
import fetch from "node-fetch";

/**
 * Получает данные о всех пулах из API Joule Finance
 * @returns {Promise<any[]>} - Полный массив с данными о пулах
 */
async function getAllJoulePools() {
    try {
        console.log("🔹 Запрашиваем все пулы из API Joule Finance...");

        const response = await fetch("https://price-api.joule.finance/api/market");
        if (!response.ok) {
            throw new Error(`Ошибка API: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data || !data.data) {
            throw new Error("❌ Получены некорректные данные о пулах.");
        }

        console.log("✅ Данные о пулах успешно получены!");
        return data.data;
    } catch (error) {
        console.error(`❌ Ошибка при получении данных о пулах: ${error.message}`);
        return [];
    }
}

/**
 * Обрабатывает GET-запрос к API
 * @param {Request} req - Запрос с возможным параметром `asset`
 * @returns {Response} - JSON с данными о пулах
 */
export async function GET(req) {
    try {
        const url = new URL(req.url);
        const asset = url.searchParams.get("asset"); // Получаем параметр asset из URL

        const pools = await getAllJoulePools();
        if (!pools.length) {
            return NextResponse.json({ error: "Нет данных о пулах" }, { status: 500 });
        }

        let filteredPools = pools;

        if (asset) {
            const assetUpper = asset.toUpperCase();
            filteredPools = pools.filter(pool => 
                pool.asset.assetName.toUpperCase().includes(assetUpper)
            );
        }

        return NextResponse.json(filteredPools, { status: 200 });
    } catch (error) {
        console.error(`❌ Ошибка в API маршруте: ${error.message}`);
        return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
    }
}
