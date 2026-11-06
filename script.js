// ====== CONFIG ======
const API_KEY    = "API_KEY_HERE";
const GROQ_API_KEY = "GROQ_API_KEY_HERE";
const BASE_URL   = "https://api.openweathermap.org/data/2.5/";

// ====== DOM ======
const $ = id => document.getElementById(id);
const cityInput        = $('cityInput');
const searchBtn        = $('searchBtn');
const weatherIcon      = $('weatherIcon');
const temperature      = $('temperature');
const cityName         = $('cityName');
const condition        = $('condition');
const humidity         = $('humidity');
const windSpeed        = $('windSpeed');
const forecastContainer = $('forecastContainer');
const moodMessage      = $('moodMessage');
const userQuestion     = $('userQuestion');
const askAiBtn         = $('askAiBtn');
const aiResponse       = $('aiResponse');

// Current weather (used by AI)
let weather = { temp: 32, condition: "Sunny", city: "Delhi" };

// ====== EVENTS ======
window.addEventListener('DOMContentLoaded', () => fetchWeather("Delhi"));
searchBtn.addEventListener('click', () => cityInput.value.trim() && fetchWeather(cityInput.value.trim()));
cityInput.addEventListener('keypress', e => e.key === 'Enter' && cityInput.value.trim() && fetchWeather(cityInput.value.trim()));
askAiBtn.addEventListener('click', () => askAI(userQuestion.value.trim()));
document.querySelectorAll('.question-btn').forEach(btn => btn.addEventListener('click', () => askAI(btn.textContent.trim())));

// ====== WEATHER ======

async function fetchWeather(city) {
    forecastContainer.innerHTML = "<p>Loading forecast... ☁️</p>";

    try {
        const cityMap = {
            delhi: "Delhi,IN",
            mumbai: "Mumbai,IN",
            amritsar: "Amritsar,IN",
            kalnaur: "Kalanaur,IN",
            kalanaur: "Kalanaur,IN",
            gurdaspur: "Gurdaspur,IN",
            grdaspur: "Gurdaspur,IN"
        };

        const q = encodeURIComponent(
            cityMap[city.trim().toLowerCase()] || city.trim()
        );

        const [curRes, foreRes] = await Promise.all([
            fetch(`${BASE_URL}weather?q=${q}&units=metric&appid=${API_KEY}`),
            fetch(`${BASE_URL}forecast?q=${q}&units=metric&appid=${API_KEY}`)
        ]);

        const curData = await curRes.json();
        const foreData = await foreRes.json();

        if (!curRes.ok) {
            throw new Error("Current weather: " + curData.message);
        }

        updateWeather(curData);

        if (!foreRes.ok) {
            console.error("Forecast API error:", foreData);
            forecastContainer.innerHTML =
                `<p>Forecast error: ${foreData.message || foreRes.status}</p>`;
            return;
        }

        console.log("Forecast data received:", foreData);
        updateForecast(foreData);

    } catch (error) {
        console.error("CloudBuddy error:", error);
        forecastContainer.innerHTML =
            `<p>Something went wrong: ${error.message}</p>`;
    }
}


function updateWeather(d) {
    const temp = Math.round(d.main.temp);
    const cond = d.weather[0].main;
    const icon = d.weather[0].icon;

    weather = { temp, condition: cond, city: d.name };

    temperature.innerText = `${temp}°C`;
    cityName.innerText    = d.name;
    condition.innerText   = d.weather[0].description.replace(/^\w/, c => c.toUpperCase());
    humidity.innerText    = `${d.main.humidity}%`;
    windSpeed.innerText   = `${Math.round(d.wind.speed * 3.6)} km/h`;
    weatherIcon.innerText = getEmoji(icon);

    document.body.className = icon.includes('n') ? 'night'
        : cond.match(/Rain|Drizzle|Thunderstorm/) ? 'rainy' : 'sunny';

    moodMessage.innerText =
        temp > 30 ? "CloudBuddy says: Stay hydrated and find some shade 🍦🍹" :
        temp < 15 ? "CloudBuddy says: Brrr! Snuggle up with a hot cocoa ☕🍁" :
        cond.toLowerCase().includes('rain') ? "CloudBuddy says: Cozy rain vibes! Perfect for lo-fi and books 📖🎧" :
        `CloudBuddy says: Have a beautiful day in ${d.name}! ✨`;
}


function updateForecast(d) {
    if (!d.list || d.list.length === 0) {
        forecastContainer.innerHTML = "<p>Forecast data is unavailable.</p>";
        return;
    }

    // Group forecast entries by date
    const dailyForecast = {};

    d.list.forEach(item => {
        const date = item.dt_txt.split(" ")[0];

        if (!dailyForecast[date]) {
            dailyForecast[date] = [];
        }

        dailyForecast[date].push(item);
    });

    // Select the forecast closest to 12 PM for each day
    const list = Object.values(dailyForecast)
        .map(day => {
            return day.reduce((closest, current) => {
                const closestHour = new Date(closest.dt * 1000).getUTCHours();
                const currentHour = new Date(current.dt * 1000).getUTCHours();

                return Math.abs(currentHour - 12) <
                       Math.abs(closestHour - 12)
                    ? current
                    : closest;
            });
        })
        .slice(0, 5);

    // Display forecast cards
    forecastContainer.innerHTML = list.map(item => {
        const date = item.dt_txt.split(" ")[0];

        return `
            <div class="forecast-day">
                <div class="icon">${getEmoji(item.weather[0].icon)}</div>
                <div class="day">
                    ${new Date(date + "T12:00:00").toLocaleDateString(
                        'en-US',
                        { weekday: 'short' }
                    )}
                </div>
                <div class="temp">${Math.round(item.main.temp)}°C</div>
            </div>
        `;
    }).join('');
}


function getEmoji(c) {
    if (c.includes('01')) return c.includes('n') ? '🌙' : '☀️';
    if (c.includes('02')) return '🌤';
    if (c.includes('03') || c.includes('04')) return '☁️';
    if (c.includes('09') || c.includes('10')) return '🌧';
    if (c.includes('11')) return '🌩';
    if (c.includes('13')) return '❄️';
    if (c.includes('50')) return '🌫';
    return '🌤';
}

// ====== AI ======

async function askAI(question) {
    if (!question) {
        aiResponse.innerText = "Please ask me something first! 🧸";
        return;
    }

    aiResponse.innerText = "✨ CloudBuddy is thinking... 🧸";

    const prompt = `You are CloudBuddy, a cozy and friendly weather assistant.
Current weather in ${weather.city}: ${weather.temp}°C, ${weather.condition}.
Answer warmly in 2-3 helpful sentences.
User question: ${question}`;

    try {
        const res = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: "openai/gpt-oss-20b",
                    messages: [
                        {
                            role: "system",
                            content: "You are CloudBuddy, a cozy and friendly weather assistant. Keep answers warm, simple and helpful."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ]
                })
            }
        );

        const data = await res.json();

        if (!res.ok) {
            throw new Error(
                data.error?.message || `API error ${res.status}`
            );
        }

        const answer = data.choices?.[0]?.message?.content;

        if (!answer) {
            throw new Error("Groq returned no answer.");
        }

        aiResponse.innerText = answer;

    } catch (error) {
        console.error("CloudBuddy AI error:", error);
        aiResponse.innerText =
            `Sorry! CloudBuddy couldn't respond: ${error.message} 🧸`;
    }
}
