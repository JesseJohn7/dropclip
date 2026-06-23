# Dropclip

![GitHub stars](https://img.shields.io/github/stars/JesseJohn7/dropclip?style=social)  
![License](https://img.shields.io/badge/license-MIT-blue)

Dropclip is a web application that allows users to download videos from various platforms such as TikTok, Instagram, X (formerly Twitter), Facebook, and YouTube in full quality. It provides a simple and fast solution for video downloads, streamlining the process with an easy-to-use interface.

## Technologies

- **TypeScript** for type safety
- **Next.js** as the framework
- **React** for the UI
- **Supabase** for backend services
- **Tailwind CSS** for styling

## Installation

To get started with Dropclip, ensure you have Node.js installed. Clone the repository and install the necessary dependencies:

```bash
git clone https://github.com/JesseJohn7/dropclip.git
cd dropclip
npm install
```

## Usage

To run the application in development mode, use the following command:

```bash
npm run dev
```

This will start the development server, and you can access the application at `http://localhost:3000`.

### API Endpoints

#### Download Video

To download a video, make a `POST` request to `/api/download` with a JSON body containing the video URL:

```json
{
  "url": "https://www.tiktok.com/@user/video/123456789"
}
```

##### Example Usage in Fetch

```javascript
fetch('/api/download', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ url: 'https://www.tiktok.com/@user/video/123456789' }),
})
.then(response => response.json())
.then(data => console.log(data));
```

#### Proxy Video Streaming

You can also stream videos directly by providing a URL parameter in a `GET` request to `/api/proxy`:

```http
GET /api/proxy?url=https%3A%2F%2Fwww.instagram.com%2Fvideo-url
```

Now on render

## Features

- Download videos from multiple platforms.
- Fast and hassle-free downloads in full quality.
- Simple and clean UI for a better user experience.

## Contributing

Contributions are welcome! If you have suggestions for improvements or features, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.