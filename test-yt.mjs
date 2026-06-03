const videoId = 'dQw4w9WgXcQ' // a simple public test video

const res = await fetch(
  `https://youtube-media-downloader.p.rapidapi.com/v2/video/details?videoId=${videoId}`,
  {
    method: 'GET',
    headers: {
      'x-rapidapi-host': 'youtube-media-downloader.p.rapidapi.com',
      'x-rapidapi-key': 'c9d1594db6mshc4cf9c54c0efd2bp1a7e50jsn26c549bd7771',
    },
  }
)

const data = await res.json()
console.log(JSON.stringify(data, null, 2))