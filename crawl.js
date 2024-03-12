/****************************************************************************
 * Site Crawler
 * @description Crawls websites to extract data and create relative material
 * for comparisons and analysis of a site.
 ****************************************************************************/

// Imports ==================================================================//

import fs from 'fs'
import chalk from 'chalk'
import figlet from "figlet"
import inquirer from "inquirer"
import * as cheerio from "cheerio"
import { exit } from 'process'

// Variables ================================================================//

const urlPattern = /^(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/i
const httpPattern = /^https?:\/\//

let originalUrl = undefined
const crawledUrls = new Set()
let crawlQueue = new Set()
const sitemap = {}

// Functions ================================================================//

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
} // delay

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

            sitemap[title] = { url, headings, internalLinks, externalLinks }
        
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

function generateHtmlSitemap(data) {
  let html =
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Crawled Site Map</title></head><body>';
  html += "<h1>Crawled Site Map</h1>";
  for (const title in data) {
    const page = data[title];
    html += `<h2>${title}</h2>`;
    html += `<h3>Headings:</h3>`;
    html += "<ul>";
    page.headings.forEach((heading) => {
      const level = parseInt(heading.level, 10); // Convert level to number for padding
      html += `<li style="padding-left: ${level * 15}px;">${heading.text}</li>`;
    });
    html += "</ul>";

    if (page.externalLinks.length) {
      html += `<h3>External Links:</h3>`;
      html += "<ul>";
      page.externalLinks.forEach((link) => {
        html += `<li><a href="${link}" target="_blank">${link}</a></li>`;
      });
      html += "</ul>";
    }
  }
  html += "</body></html>";
  return html;
} // generateHtmlSitemap

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

async function main () {
  console.log(chalk.blue(figlet.textSync('SiteCrawler', {})))

  const userAnswers = await questions()
    .then(answers => answers)
    .catch(err => exit())

  let project = createProject(userAnswers.projectName)

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

    // create HTML page
    const HTML = generateHtmlSitemap(sitemap)
    fs.writeFileSync(`${project.projectDir}/sitemap.json`, JSON.stringify(sitemap))
    fs.writeFileSync(`${project.projectDir}/outline.html`, HTML)
    console.log(chalk.blueBright(`Site outline generated: ${project.projectDir}/outline.html`))
  } // if
} // main

// Application Start-Up =====================================================//

main()