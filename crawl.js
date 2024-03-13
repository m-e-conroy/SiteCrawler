/****************************************************************************
 * Site Crawler
 * @description Crawls websites to extract data and create relative material
 * for comparisons and analysis of a site.
 * 
 * Sitemap Layout:
 * {
 *  "page title": {
 *    url: string,
 *    headings: array,
 *    internalLinks: array,
 *    externalLinks: array
 *  }
 * }
 ****************************************************************************/

// Imports ==================================================================//

import fs from 'fs'
import chalk from 'chalk'
import figlet from "figlet"
import inquirer from "inquirer"
import * as cheerio from "cheerio"
import { exit } from 'process'
import puppeteer from 'puppeteer'
import Randomstring from "randomstring"

// Variables ================================================================//

const urlPattern = /^(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/i
const httpPattern = /^https?:\/\//

let originalUrl = undefined
const crawledUrls = new Set()
let crawlQueue = new Set()
let sitemap = []
let project

// Functions ================================================================//

/**
 * Delay
 * @description Delay execution by 'ms' milliseconds. 1000 = 1 second.
 * @param {*} ms 
 * @returns Promise
 */
async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
} // delay

/**
 * Queue Pop
 * @description Retrieves the last item in the queue (Set) and removes it from the Set.
 * @returns {*}|false
 */
function queuePop() {
  let lastItem
  if (crawlQueue.size > 0) {
    for (let i of crawlQueue)
      lastItem = i
    crawlQueue.delete(lastItem)
    return lastItem
  }
  return false
} // setPop

/**
 * Is External URL
 * @description Identifies whether or not a URL is from the same origin as the requested URL.
 * @param {*} url 
 * @returns Boolean
 */
function isExternalUrl(url) {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.origin !== originalUrl.origin;
  } catch (error) {
    console.error(chalk.red(`Error determining external URL (${url}): ${error}`))
    return true
  }
} // isExternalUrl

/**
 * Remove Query Hash
 * @description Removes and querystring and hash values from the URL.
 * @param {*} url 
 * @returns string
 */
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

/**
 * Crawl
 * @description Given a URL it will access the page and save all headings and links to the sitemap array.
 * @param {*} url 
 * @returns Promise
 */
async function crawl(url) {
  return new Promise(async (resolve, reject) => {
    if (crawledUrls.has(url)) {
      resolve()
    }
  
    if (!originalUrl) originalUrl = new URL(url)
  
    try {
      if (!urlPattern.test(url)) throw 'URL not properly formed.'
  
      await fetch(url).then(async resp => {
        let HTML = await resp.text()
        resp.headers.forEach((key, val) => {
          if ((val.toLowerCase() === 'content-type') && key.toLowerCase().match(/html/)) {
            let $ = cheerio.load(HTML)

            // save page title and headings
            let title = $("title").text().trim()
            let headings = []
            $("h1, h2, h3, h4, h5, h6").each((i, element) => {
              let text = $(element).text().trim()
              let level = $(element).prop("tagName").slice(1) // Extract level from tag name
              headings.push({ text, level })
            })
        
            // extract page's links
            let internalLinks = new Set()
            let externalLinks = new Set()
        
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
              if (link.startsWith("http")) {
                (isExternalUrl(link)) ? externalLinks.add(link) : internalLinks.add(link)
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
                  console.log(chalk.red(`Failed to create internal relative link for: ${baseUrl} (${error.message})`))
                }
              }
            }) // $(a)
            

            crawledUrls.add(url)

            internalLinks = [...internalLinks]
            externalLinks = [...externalLinks]

            internalLinks.map(url => {
              if (url.startsWith('http')) {
                url = removeQueryHash(url)
                if (!crawledUrls.has(url)) crawlQueue.add(url)
              }
              return url
            })
            internalLinks = [...new Set(internalLinks)]

            sitemap.push({ title, url, headings, internalLinks, externalLinks })
        
            console.log(chalk.blueBright(`Crawled: ${url}`))
            console.log(chalk.blueBright(`Title: ${title}`))
            console.log(chalk.blueBright(`Internal/External Links: ${internalLinks.length}/${externalLinks.length}`))
            console.log(chalk.yellowBright('-------------------------------------------------------------'))
          }

        }) // resp.headers

      }) //  fetch
      resolve()
    } catch (error) {
      console.error(chalk.red(`Error crawling ${url}: ${error.message}`))
      reject()
    }
  })
} // crawl

/**
 * Take Screenshots
 * @description Takes a fullpage screenshot of a page and saves it to an image and to the sitemap array.
 */
async function takeScreenshots () {
  return new Promise(async (resolve, reject) => {
    console.log(chalk.bgMagentaBright.black('Taking Screenshots.'))
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
    const loadedPage = await browser.newPage()

    for (let i=0,cnt=sitemap.length; i<cnt; i++) {
      await loadedPage.goto(sitemap[i].url)
      let filename = `${Randomstring.generate({ chartset: 'alphanumberic' })}-${new Date().toLocaleString().replace(/\s+/g,'_').replace(/[^a-zA-Z0-9]+/g,'-')}.png`
      await loadedPage.screenshot({ path: `${project.imageDir}/${filename}`, fullPage: true })
      sitemap[i].image = filename

      console.log(chalk.bgWhiteBright.black(`Screenshot taken: ${sitemap[i].title}`))
    }

    await browser.close().finally(() => {
      resolve()
    })
  })
} // takeScreenshots

/**
 * Generate HTML Sitemap
 * @description Uses the heading data to make a crude outline of pages on the site.
 * @param {*} data 
 * @returns string
 */
function generateHtmlSitemap(data) {
  let html =
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Crawled Site Map</title></head><body>'
  html += "<h1>Crawled Site Map</h1>"
  for (const i in data) {
    const page = data[i];
    html += `<div class="page"><h2>${page.title}</h2>`
    html += `<div class="headings"><h3>Headings:</h3>`
    html += "<ul>"
    page.headings.forEach((heading) => {
      const level = parseInt(heading.level, 10) // Convert level to number for padding
      html += `<li style="padding-left: ${level * 15}px;">${heading.text}</li>`
    });
    html += '</ul></div>'

    if (page.externalLinks.length) {
      html += `<div class="links"><h3>External Links:</h3>`
      html += '<ul>'
      page.externalLinks.forEach((link) => {
        html += `<li><a href="${link}" target="_blank">${link}</a></li>`
      });
      html += '</ul></div>'
    }
    html += '</div>'
  }
  html += '</body></html>'
  return html;
} // generateHtmlSitemap

/**
 * Create Project
 * @description Creates a project directory for the given request based on the project name input.
 * @param {*} project 
 * @returns 
 */
function createProject (project) {
  const projectDir = `projects/${project.replace(/[^a-zA-Z]/g, '-').toLowerCase()}`
  const imgDir = `${projectDir}/img`

  try {
    fs.mkdirSync(projectDir)
    fs.mkdirSync(imgDir)
    console.log(chalk.bgGreenBright(`Created project directory for: ${project}`))

    return { projectDir: projectDir, imageDir: imgDir }
  } catch (err) {
    if (fs.existsSync(projectDir)) {
      console.log(chalk.blueBright(`Directory already exists for: ${project}`))
      return { projectDir: projectDir, imageDir: imgDir }
    } else {
      console.error(chalk.redBright(`Failed to create project directory for: ${project}`))
      return false
    }
  }
} // end createProject

/**
 * Questions
 * @description Asks the user several questions to get the application started.
 * @returns Promise
 */
function questions () {
  return new Promise((resolve, reject) => {
    inquirer
      .prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'Enter your project name: ',
          default: 'Admissions',
          validate: val => val != undefined
        },{
          type: 'input',
          name: 'url',
          message: 'Enter the URL to crawl: ',
          default: 'admissions.buffalo.edu',
          validate: val => urlPattern.test(val)
        }
      ])
      .then(answers => resolve(answers))
      .catch(error => {
        console.error(chalk.red(`Error crawling ${url}: ${error.essage}`))
      })
  }) // Promise
} // questions

/**
 * Main
 * @description Starts the application
 */
async function main () {
  console.log(chalk.blue(figlet.textSync('SiteCrawler', {})))

  const userAnswers = await questions()
    .then(answers => answers)
    .catch(err => exit())

  project = createProject(userAnswers.projectName)

  if (project !== false) {
    (!httpPattern.test(userAnswers.url)) ? crawlQueue.add(`https://${userAnswers.url}`) : crawlQueue.add(userAnswers.url)

    let url = ''
    while (crawlQueue.size > 0) {
      url = queuePop()
      if (url !== false) {
        console.log(chalk.bgMagentaBright.black(`Crawling: ${url}`))
        console.log(chalk.bgYellowBright.black(`Links in the queue: ${crawlQueue.size}`))
        await crawl(url)
          .catch(resp => {
            console.log(resp)
            console.error(chalk.red(`An error occurred while crawling: ${url}`))
          })
          .finally(() => {
            console.log(chalk.bgWhiteBright.black(`Links in the queue: ${crawlQueue.size}`))
          })
      } // if
      await delay(1000)
    } // while

    // capture images
    await takeScreenshots().then(() => console.log(chalk.bgYellowBright.black('Finished taking screenshots.')))

    // create HTML page
    // const HTML = generateHtmlSitemap(sitemap)
    fs.writeFileSync(`${project.projectDir}/sitemap.json`, JSON.stringify(sitemap))
    // fs.writeFileSync(`${project.projectDir}/outline.html`, HTML)
    // console.log(chalk.blueBright(`Site outline generated: ${project.projectDir}/outline.html`))
    console.log(chalk.blueBright(`Site crawled and a sitemap generated: ${project.projectDir}/sitemap.json`))
  } // if
} // main

// Application Start-Up =====================================================//

main()