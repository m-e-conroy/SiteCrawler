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
import puppeteer from "puppeteer"
import * as cheerio from "cheerio"

// Variables ================================================================//

const urlPattern = /^(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/i
const commentPattern = /<!--(.*?)-->/g
const httpPattern = /^https?:\/\//

const unwantedProtocolsPattern = /[mailto|tel]:/i // remove all urls that are email and telephone links
const unwantedUrlsPattern = /^[#|\/]$/i // remove urls that are only a hash tag or slash
const documentPattern = /\.(pdf|doc|docx|txt|wpd|xls|jpg|jpeg|gif|png|webp|avif|tiff|psd)/gi

let userAnswers = {}
let URLS = {
  baseUrl: undefined,
  originalUrl: undefined,
  urlSansProtocol: undefined,
  domain: undefined
}
const urlQueue = []
const urlsVisited = []
let startTimer = ''

// Functions ================================================================//

function questions () {
  const Q = [
    {
      type: 'input',
      name: 'projectName',
      message: 'Enter your project name:',
      validate: val => val != undefined
    },
    {
      type: 'input',
      name: 'url',
      message: 'Enter the URL of the website you would like to crawl:',
      default: 'admissions.buffalo.edu',
      validate: val => urlPattern.test(val)
    },
    {
      type: 'confirm',
      name: 'screenshot',
      message: 'Would you like a screenshot of the URL?',
      default: false
    }
  ]

  return new Promise((resolve, reject) => {
    inquirer.prompt(Q)
      .then(answers => resolve(answers))
      .catch(err => {
        console.error(chalk.bgRed.white('Something went wrong while saving your answers.'))
        reject(err)
      })
  })
} // questions

// HTML .....................................................................//

function removeHTMLComments (HTML) {
  return HTML.replace(commentPattern, '')
} // removeHTMLComments

function getBaseHref(HTML) {
  const $ = cheerio.load(HTML)

  // Find the base tag in the HTML
  const baseTag = $('base');

  // Extract the href attribute from the base tag
  if (baseTag) {
    return baseTag.attr('href')
  }
  return ''
} // getBaseHref

function getLinks (HTML) {
  const $ = cheerio.load(HTML)

  const links = $('a[href]:not(a[href^="#"])')
  const extracted = []
  links.each((i, link) => {
    extracted.push($(link).attr('href'))
  })

  return extracted
} // getLinks

function filterLinks (links) {
  // remove all fully qualified links that are not in the domain we are crawling

  links = links.filter(link => {
    if (httpPattern.test(link)) { // check fully qualified URLs against our baseURL
      let regex = new RegExp(URLS.baseUrl, 'i')
      if (!regex.test(link)) return false
    }
    return !unwantedProtocolsPattern.test(link) && !unwantedUrlsPattern.test(link) && !documentPattern.test(link)
  })
  return links
} // filterLinks

function processRelativeLinks (links, baseHref) {
  baseHref = normalizeBase(baseHref)

  links = links.map(link => {
    if (link.charAt(0) === '/') {
      return `https://${URLS.domain}${link}`
    }
    return `${baseHref}${link}`
  })

  // remove duplicates
  return [...new Set(links)]
} // processRelativeLinks

function filterForVisitedLinks (links) {
  return new Promise((resolve, reject) => {
    links.forEach(link => {
      if (!urlsVisited.includes(link) && !urlQueue.includes(link)) {
        urlQueue.push(link)
      }
    })
    resolve()
  })
} // filterForVisitedLinks

function removeHash (links) {
  return links.map(link => {
    return link.split('#')[0]
  })
} // removeHash

// URL ......................................................................//

function removeQueryString (URL) {
  return URL.split('?')[0]
} // removeQueryString

function removeHashString (URL) {
  return URL.split('#')[0]
} // removeHashString

function normalizeUrl (URL) {
  URL = removeHashString(removeQueryString(URL))
  const originalUrl = (httpPattern.test(URL)) ? URL : `https://${URL}`
  const urlSansProtocol = originalUrl.replace(httpPattern, '')
  const domain = urlSansProtocol.split('/')[0]
  let baseUrl = ''

  // determine if we have a directory or a file at the end of the URL
  let slashIndex = originalUrl.lastIndexOf('/')
  if ((slashIndex + 1) === originalUrl.length) { // directory
    console.log('1')
    baseUrl = originalUrl
  } else {
    let urlEnding = originalUrl.substring((slashIndex + 1), originalUrl.length)
    
    if (urlEnding !== domain) {
      let fileType = urlEnding.split('.')
      if (fileType.length > 1) { // file - need to figure out directory
        baseUrl = originalUrl.substring(0, slashIndex)
      } else { // asssume directory
        baseUrl = originalUrl
      }
    } else {
      baseUrl = originalUrl
    }
  } // if

  return {
    baseUrl,
    originalUrl,
    urlSansProtocol,
    domain
  }
} // normalizeUrl

function normalizeBase (baseHref) {
  if (baseHref) {
    if (!httpPattern.test(baseHref)) {
      if (baseHref.charAt(0) === '/') {
        baseHref = `https://${URLS.domain}/`
      } else {
        baseHref = `https://${URLS.domain}/${baseHref}`
      }
    }
  } else {
    baseHref = URLS.originalUrl
  }
  return (baseHref.charAt(baseHref.length - 1) !== '/') ? `${baseHref}/` : baseHref
} // normalizeBase

async function crawl () {
  let urlActive = ''
  while(urlActive = urlQueue.shift()) {
    console.log(chalk.gray(`Crawling: ${urlActive}`))
    let html = await fetch(urlActive).then(resp => resp.text())
    if (html) {
      let baseHref = getBaseHref(html)
      let links = processRelativeLinks(filterLinks(removeHash(getLinks(html))), baseHref)
      await filterForVisitedLinks(links)

      // determine full links with URL
      console.log(`BASE HREF: ${baseHref}`)
      console.log(`LINKS: `, urlQueue)
    } else {
      console.log(chalk.red(`Empty data returned for: ${urlActive}`))
    }
  }
} // crawl

// Projects .................................................................//

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

// Main .....................................................................//

async function main () {
  console.log(chalk.blue(figlet.textSync('SiteCrawler', {})))

  userAnswers = await questions()
    .then(answers => answers)
    .catch(err => exit())

  // create project directory
  let project = createProject(userAnswers.projectName)

  if (project !== false) {
    URLS = normalizeUrl(userAnswers.url)
    urlQueue.push(URLS.originalUrl)
    console.log(chalk.blue(`Crawl initiated at ${new Date().toLocaleString()}`))
    startTimer = performance.now()
    crawl()
  } // if (project)
} // main

// Application ==============================================================//

main()