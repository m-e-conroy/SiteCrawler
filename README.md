<h3 align="center">SiteCrawler</h3>

---

## 📝 Table of Contents

- [About](#about)
- [Getting Started](#getting_started)
- [Usage](#usage)
- [Built Using](#built_using)
- [Authors](#authors)

## 🧐 About <a name = "about"></a>

Simple NodeJS commandline application that crawls a given URL and all sub-urls, creating an outline of headings on each page as well as a collection of internal and external links.  Full-length screenshots of each page are also taken.

## 🏁 Getting Started <a name = "getting_started"></a>

```
> git clone https://github.com/m-e-conroy/sitecrawler
```

### Prerequisites

- NodeJS v18+


### Installing

```
> npm i
```

## 🎈 Usage <a name="usage"></a>

There are 3 scripts of note here:

- crawl.js
- build.js
- server.js

### Crawling

Run this script to crawl a URL and all URLs under that.  A good use is to crawl an entire domain.  It will not follow URLs to external domains.

The crawl will produce a project folder with the name of the project you give it. When you run the script it will ask you several questions before performing the crawl, one of those is the name of the project.

```
> npm run crawl
```

When the crawl is finished in the project folder you should find an `img/` folder with screenshots of all pages and a `sitemap.json` containing data about each page.

### Building the HTML Results Page

Running the build script will use the `sitemap.json` to build an `index.html` page for your project.

```
> npm run buildHTML
```

### Viewing Your Results Page

Run the server script to setup a quick and easy server to your project so you can access it locally in your browser.

```
> npm run server
```

It will ask which project you wish to serve.

## ⛏️ Built Using <a name = "built_using"></a>

- [Cheerio](https://cheerio.js.org/) - HTML Parser
- [Puppeteer](https://pptr.dev/) - Dev Tools
- [NodeJs](https://nodejs.org/en/) - Server Environment

## ✍️ Authors <a name = "authors"></a>

- [@m-e-conroy](https://github.com/m-e-conroy/)
