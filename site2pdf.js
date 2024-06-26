import puppeteer from 'puppeteer'
import * as cheerio from 'cheerio'
import fs from 'fs'

const urlPattern = /^(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/i
const httpPattern = /^https?:\/\//

let originalUrl = undefined
let regExOriginalURL = undefined
const crawledUrls = new Set()
let crawlQueue = new Set()

let internalLinks = new Set()

const PDF = []

const browser = await puppeteer.launch({
  headless: 'new',
  dumpio: true,
  args: [
    '--enable-chrome-browser-cloud-management',
    '--disable-extensions',
    '--no-sandbox'
  ],
  defaultViewport: {
    width: 1280,
    height: 800
  },
  slowMo: 1000
})

const page = await browser.newPage()


async function captureWebsiteAsPdf(url) {
  console.log(`Loading: ${url}`)
  const browser = await puppeteer.launch({
    headless: 'new',
    dumpio: true,
    args: [
      '--enable-chrome-browser-cloud-management',
      '--disable-extensions',
      '--no-sandbox'
    ],
    defaultViewport: {
      width: 1280,
      height: 800
    },
    slowMo: 1000
  })
  console.log(`Loading: browser`)
  const page = await browser.newPage()
  console.log(`Loading: page`)

  try {
    const HTML = await page.goto(url, {
      waitUntil: 'networkidle2'
    }).then(() => page.content())

    // remove unwanted HTML items
    const $ = cheerio.load(HTML)
    $('footer').remove()
    $('header').remove()
    $('nav').remove()
    page.setContent($.html())
    //await page.setViewport({ width: 1920, height: 1080 })

    /* const pages = await getPagesFromWebsite(page)

    const pdf = await combinePdf(pages)

    fs.writeFileSync('output.pdf', pdf)
    console.log('PDF captured successfully!') */
    await page.pdf({
      path: 'PDFS/temp.pdf',
      format: 'A4',
      margin: { top: '1cm', bottom: '1cm' }
    }).then(() => {
      console.log('Created PDF')
    })
  } catch (error) {
    console.error(error)
  } finally {
    await browser.close()
  }
} // captureWebsiteAsPdf

function isExternalUrl(url) {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.origin !== originalUrl.origin;
  } catch (error) {
    console.error(chalk.red(`Error determining external URL (${url}): ${error}`))
    return true
  }
} // isExternalUrl

function removeQueryHash(url) {
  try {
    if (url.match(/\?/))
      url = url.split(/\?/)[0]
    if (url.match(/#/))
      url = url.split(/#/)[0]
    return url
  } catch (error) {
    console.error(chalk.red(`Error removing query/hash (${url}): ${error.message}`))
    return url
  }
} // removeQueryHash

function queuePop() {
  let lastItem
  if (crawlQueue.size > 0) {
    for (let i of crawlQueue)
      lastItem = i
    crawlQueue.delete(lastItem)
    return lastItem
  }
  return false
} // queuePop

async function crawl(url) {
  return new Promise(async (resolve, reject) => {
    if (crawledUrls.has(url)) {
      resolve()
    }

    if (!originalUrl) originalUrl = new URL(url)

    try {
      if (!urlPattern.test(url)) throw 'URL not properly formed.'

      await page.goto(url, {
        waitUntil: 'networkidle2'
      }).then(async () => {
        // open up accordions
        await page.$$('.accordion-title')
          .then(async titles => {
            for(const title of titles) {
              await title.click()
            }
          })
      }).catch(async e => {
        await page.$$('.accordion-title')
          .then(async titles => {
            for(const title of titles) {
              await title.click()
            }
          })
      })

      const HTML = await page.content()
  
      // remove unwanted HTML items
      const $ = cheerio.load(HTML)

      let links = $("a")
      links = links.map((i, element) => {
          const href = $(element).attr("href")
          if (href) {
            return href.trim()
          }
          return null
        })
        .filter(Boolean)
      
      links.each((i, link) => {
        if (link.startsWith("http") && !isExternalUrl(link)) {
          internalLinks.add(link)
        } else {
          // Handle relative URL based on base tag
          let baseUrl = $("base[href]").attr("href") || url
          try {
            if (link !== '/') {
              baseUrl = new URL(baseUrl, originalUrl).toString()
              link = new URL(link, baseUrl).toString()
              internalLinks.add(link)
            }
          } catch (error) {
            console.log(`Failed to create internal relative link for: ${baseUrl} (${error.message})`)
          }
        }
      }) // $(a)

      crawledUrls.add(url)

      const iLinks = [...internalLinks]
      iLinks.forEach(url => {
        if (url.startsWith('http')) {
          url = removeQueryHash(url)
          if (!crawledUrls.has(url) && url.match(regExOriginalURL)) crawlQueue.add(url)
        }
      })
      internalLinks.clear()

      let pdfName = ($('title').text()).split(/\-/)
      pdfName = (!pdfName[1].match(/2223/)) ? `${pdfName[0]}${pdfName[1]}` : pdfName[0]
      pdfName = pdfName.trim().replace(/[^a-zA-Z]/g,' ')
      $('footer').remove()
      $('header').remove()
      $('nav').remove()
      $('.associated-programs').remove()
      $('.associated-subjects').remove()

      await page.setContent($.html())

      

      await page.pdf({
        path: `PDFS/2223/courses/${pdfName}.pdf`,
        format: 'A4',
        margin: { top: '1cm', bottom: '1cm' }
      }).then(() => {
        console.log(`CREATED PDF: ${pdfName}.pdf`)
      })/* .then(() => {
        console.log('TEMP PDF')
        const buffer = fs.readFileSync('PDFS/temp.pdf')
        PDF.push(buffer)
        fs.unlink('PDFS/temp.pdf',err => {
          if (err) {
            console.log(`UNLINK ERROR: ${err.message}`)
          } else {
            console.log('UNLINKED TEMP PDF')
          }
        })
      }) */
      resolve()
    } catch (e) {
      console.error(`Error crawling ${url}: ${e.message}`)
      reject(e.message)
    }
  })
} // crawl

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
} // delay

async function startCrawl (site) {
  regExOriginalURL = new RegExp(site, 'i')
  console.log('STARTING SITE2PDF')
  crawlQueue.add(site)
  while (crawlQueue.size > 0) {
    const url = queuePop()
    if (url !== false) {
      console.log(`CRAWLING: ${url}`)
      await crawl(url)
        .catch(resp => {
          console.error(`Error while crawling: ${url}`)
        })
        .finally(() => {
          console.log(`QUEUE: ${crawlQueue.size}`)
        })
    }
    await delay(500)
  } // while
  /* console.log('BUILDING PDF')
  page.setContent(Buffer.concat(PDF))
  page.pdf({
    path: 'PDFS/combined.pdf',
    format: 'A4',
    margin: { top: '1cm', bottom: '1cm' }
  }) */
  console.log('CLOSING BROWSER')
  await browser.close()
} // startCrawl

async function getPagesFromWebsite(page) {
  const pages = []
  const links = await page.$$('a')

  for (const link of links) {
    const href = await page.evaluate((element) => element.href, link)

    if (!href.includes('javascript:') && !href.startsWith('#')) {
      try {
        await page.goto(href)
        pages.push(await page.pdf({
          path: 'temp.pdf',
          format: 'A4',
          printBackground: true,
          margin: { top: '1cm', bottom: '1cm' },
        }))
      } catch (error) {
        console.error(`Error capturing ${href}:`, error)
      }
    }
  }

  return pages
}

async function combinePdf(pages) {
  const pdf = []
  for (const page of pages) {
    const buffer = await fs.readFileSync('temp.pdf')
    pdf.push(buffer)
    await fs.unlink('temp.pdf')
  }

  const combinedBuffer = Buffer.concat(pdf)

  return combinedBuffer
}

async function page2Pdf (url) {
  return new Promise(async (resolve, reject) => {
    await page.goto(url, {
      waitUntil: 'networkidle2'
    }).then(async () => {
      const HTML = await page.content()
      const $ = cheerio.load(HTML)
    
      let pdfName = ($('title').text()).split(/\-/)
      pdfName = (!pdfName[1].match(/2223/)) ? `${pdfName[0]}${pdfName[1]}` : pdfName[0]
      pdfName = pdfName.trim().replace(/[^a-zA-Z]/g,' ')
      $('footer').remove()
      $('header').remove()
      $('nav').remove()
      $('.associated-programs').remove()
      $('.associated-subjects').remove()
      // open up accordions
      await page.$$('.accordion-title')
        .then(async titles => {
          for(const title of titles) {
            await title.click()
          }
        })

      await page.setContent($.html())

      await page.pdf({
        path: `PDFS/2223/academicprograms/majors/${pdfName}.pdf`,
        format: 'A4',
        margin: { top: '1cm', bottom: '1cm' }
      }).then(() => {
        resolve()
        console.log(`CREATED PDF: ${pdfName}.pdf`)
      })

    }).catch(e => {
      console.error(e)
      reject(e)
    })
  })
} // page2Pdf

// captureWebsiteAsPdf('https://catalog-archives.apps.buffalo.edu/2122/')

// startCrawl('https://catalog-archives.apps.buffalo.edu/2223/courses/')

const URLS = [
]

for (let i=0, cnt=URLS.length; i<cnt; i++) {
  console.log(URLS[i])
  await page2Pdf(URLS[i])
}
