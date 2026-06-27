const searchForm = document.getElementById("searchForm");
const locationInput = document.getElementById("locationInput");
const locationBtn = document.getElementById("locationBtn");
const message = document.getElementById("message");
const placeName = document.getElementById("placeName");
const updatedTime = document.getElementById("updatedTime");
const temperature = document.getElementById("temperature");
const condition = document.getElementById("condition");
const feelsLike = document.getElementById("feelsLike");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const pressure = document.getElementById("pressure");
const clouds = document.getElementById("clouds");
const weatherIcon = document.getElementById("weatherIcon");
const timezone = document.getElementById("timezone");
const forecastList = document.getElementById("forecastList");

const weatherCodes = {
    0: ["Clear sky", "SUN"],
    1: ["Mainly clear", "SUN+"],
    2: ["Partly cloudy", "PART"],
    3: ["Overcast", "CLD"],
    45: ["Fog", "FOG"],
    48: ["Depositing rime fog", "FOG"],
    51: ["Light drizzle", "DRZL"],
    53: ["Moderate drizzle", "DRZL"],
    55: ["Dense drizzle", "DRZL"],
    61: ["Slight rain", "RAIN"],
    63: ["Moderate rain", "RAIN"],
    65: ["Heavy rain", "RAIN"],
    71: ["Slight snow", "SNOW"],
    73: ["Moderate snow", "SNOW"],
    75: ["Heavy snow", "SNOW"],
    80: ["Rain showers", "SHWR"],
    81: ["Moderate showers", "SHWR"],
    82: ["Violent showers", "SHWR"],
    95: ["Thunderstorm", "STRM"],
    96: ["Thunderstorm with hail", "HAIL"],
    99: ["Thunderstorm with heavy hail", "HAIL"],
};

function setMessage(text, isError = false) {
    message.textContent = text;
    message.style.color = isError ? "#ffd2d2" : "rgba(255, 255, 255, 0.78)";
}

function getWeatherMeta(code) {
    return weatherCodes[code] || ["Unknown conditions", "CLD"];
}

function formatTime(value) {
    return new Intl.DateTimeFormat("en", {
        hour: "numeric",
        minute: "2-digit",
        weekday: "short",
    }).format(new Date(value));
}

async function fetchJson(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Unable to fetch weather data.");
    }

    return response.json();
}

async function getCoordinatesForCity(city) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const data = await fetchJson(url);

    if (!data.results?.length) {
        throw new Error("Location not found. Try another city name.");
    }

    const location = data.results[0];
    return {
        latitude: location.latitude,
        longitude: location.longitude,
        label: `${location.name}${location.admin1 ? `, ${location.admin1}` : ""}, ${location.country}`,
    };
}

async function getWeather({ latitude, longitude, label }) {
    setMessage("Fetching latest weather...");

    const current = [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "precipitation",
        "weather_code",
        "cloud_cover",
        "pressure_msl",
        "wind_speed_10m",
        "wind_direction_10m",
        "is_day",
    ].join(",");
    const hourly = "temperature_2m,weather_code,relative_humidity_2m";
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=${current}&hourly=${hourly}&forecast_days=1&timezone=auto`;
    const data = await fetchJson(url);

    renderWeather(data, label);
    setMessage("Weather updated successfully.");
}

function renderWeather(data, label) {
    const current = data.current;
    const [description, icon] = getWeatherMeta(current.weather_code);

    placeName.textContent = label;
    updatedTime.textContent = `Updated ${formatTime(current.time)}`;
    temperature.textContent = `${Math.round(current.temperature_2m)} deg`;
    condition.textContent = description;
    feelsLike.textContent = `Feels like ${Math.round(current.apparent_temperature)} deg C`;
    humidity.textContent = `${current.relative_humidity_2m}%`;
    wind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    pressure.textContent = `${Math.round(current.pressure_msl)} hPa`;
    clouds.textContent = `${current.cloud_cover}%`;
    weatherIcon.textContent = icon;
    timezone.textContent = `Timezone: ${data.timezone}`;

    renderForecast(data.hourly);
}

function renderForecast(hourly) {
    const now = Date.now();
    const nextIndexes = hourly.time
        .map((time, index) => ({ time, index }))
        .filter((item) => new Date(item.time).getTime() >= now)
        .slice(0, 4);

    forecastList.innerHTML = nextIndexes.map(({ time, index }) => {
        const [description, icon] = getWeatherMeta(hourly.weather_code[index]);
        return `
            <article class="forecast-item">
                <span>${formatTime(time)}</span>
                <em>${icon}</em>
                <strong>${Math.round(hourly.temperature_2m[index])} deg C</strong>
                <span>${description}</span>
            </article>
        `;
    }).join("");
}

searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const city = locationInput.value.trim();

    if (!city) {
        setMessage("Please enter a city name.", true);
        return;
    }

    try {
        const coordinates = await getCoordinatesForCity(city);
        await getWeather(coordinates);
    } catch (error) {
        setMessage(error.message, true);
    }
});

locationBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
        setMessage("Geolocation is not supported by this browser.", true);
        return;
    }

    setMessage("Requesting location permission...");
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            try {
                await getWeather({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    label: "Your Current Location",
                });
            } catch (error) {
                setMessage(error.message, true);
            }
        },
        () => setMessage("Location access was denied. Search for a city instead.", true)
    );
});

getWeather({
    latitude: 30.3165,
    longitude: 78.0322,
    label: "Dehradun, India",
}).catch((error) => setMessage(error.message, true));
