
// Imports ==================================================================//

import fs from 'fs/promises'
import path from 'path'
import puppeteer from 'puppeteer'
import * as cheerio from 'cheerio'
import inquirer from 'inquirer'
import figlet from 'figlet'
import chalk from 'chalk'
import { exit } from 'process'
import { fileURLToPath } from 'url'

// Variables ================================================================//

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
var browser, HTMLDirectory, PDFDirectory

// Functions ================================================================//

async function launchBrowser () {
  browser = await puppeteer.launch({
    headless: 'new',
    dumpio: true,
    args: [
      '--no-sandbox',
      '--enable-chrome-browser-cloud-management',
      '--disable-extensions'
    ],
    defaultViewport: {
      width: 1280,
      height: 800
    }
  }) // browser
} // launchBrowser

async function isDirectory(path) {
  try {
    const stats = await fs.stat(path)
    return stats.isDirectory()
  } catch (error) {
    // Handle potential errors (e.g., path not found, permission issues)
    if (error.code === 'ENOENT') {
      console.error(`Path not found: ${path}`)
    } else {
      console.error(`Error checking path: ${path}`, error)
    }
    return false
  }
} // isDirectory

async function readHTMLFiles (directory) {
  if (!directory) throw new Error('No directory to read from.')

  let files = await fs.readdir(directory)

  if (files?.length > 0) {
    return files
      .map(file => path.join(directory, file))
      .filter(file => path.extname(file).toLowerCase() === '.html')
  }
  return []
} // readHTMLFiles

async function createPDFs (files) {
  if (!files || files?.length <= 0) throw new Error('No files to convert.')
    
  await launchBrowser()

  for (const file of files) {
    console.info(chalk.blue(`Reading: ${file}`))

    const content = await fs.readFile(file, 'utf-8')
    const $ = cheerio.load(content)
    $('header').remove()
    $('nav').remove()
    $('footer').remove()
    $('.associated-programs').remove()
    $('.associated-subjects').remove()
    $('.skip-links').remove()

    let PDFFileName = ($('title').text()).split(/\-/)
    PDFFileName = (!PDFFileName[1].match(/2223/)) ? `${PDFFileName[0]}${PDFFileName[1]}` : PDFFileName[0]
    PDFFileName = PDFFileName.replace(/[^a-zA-Z]/g,' ').trim()

    // pupeeteer
    const page = await browser.newPage()
    await page.setContent($.html())
    console.info(chalk.blue(`Writing: ${PDFDirectory}${PDFFileName}.pdf`))
    await page.pdf({
      path: `${PDFDirectory}/${PDFFileName}.pdf`,
      format: 'A4',
      margin: { top: '1cm', bottom: '1cm' },
      printBackground: false
    }).then(() => console.info(`Created: ${PDFDirectory}/${PDFFileName}.pdf`)) // page.pdf
    await page.close()
  } // for
  
  await browser.close().finally(() => console.log(chalk.green('Finished PDF conversions.')))
} // createPDFs

function cmdLineQuestions () {
  return new Promise((resolve, reject) => {
    inquirer
      .prompt([
        {
          type: 'input',
          name: 'directory',
          message: 'Directory where the HTML documents reside? ',
          default: '../catalog-archives/2122/academicprograms/',
          validate: val => val != undefined
        }, {
          type: 'input',
          name: 'outputDirectory',
          message: 'Where to ouput PDF files? ',
          default: './PDFS/2122-Redux/academicprograms/',
          validate: val => val != undefined
        }
      ])
      .then(answers => resolve(answers))
      .catch(error => {
        console.error(chalk.red(`Error: ${error.message}`))
        reject()
      })
  })
} // cmdLineQuestions

async function main () {
  console.log(chalk.blue(figlet.textSync('HTML 2 PDF', {})))

  await cmdLineQuestions()
    .then(a => {
      HTMLDirectory = path.join(__dirname, a.directory)
      PDFDirectory = path.join(__dirname, a.outputDirectory)

      if (!isDirectory(HTMLDirectory)) throw new Error('HTML path is not a directory.')
      if (!isDirectory(PDFDirectory)) throw new Error('PDF output directory is not a directory.')
    })
    .catch(error => {
      console.error(chalk.red(`Error: ${error.message}`))
      exit()
    })

  const HTMLs = await readHTMLFiles(HTMLDirectory)
  createPDFs(HTMLs)
} // main

// Run ======================================================================//

main()

