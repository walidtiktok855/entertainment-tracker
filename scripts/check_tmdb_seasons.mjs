const response = await fetch('https://api.themoviedb.org/3/tv/1399?language=en-US', { headers: { Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`, accept: 'application/json' } });
const body = await response.json();
console.log(JSON.stringify({ ok: response.ok, seasons: body.seasons?.map((season) => ({ season_number: season.season_number, episode_count: season.episode_count })) }, null, 2));
