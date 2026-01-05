// Script to group laws and amendments from all_laws.json
const fs = require('fs')
const path = require('path')

const inputPath = path.join(__dirname, 'public', 'all_laws.json')
const outputPath = path.join(__dirname, 'public', 'grouped_laws.json')

const raw = fs.readFileSync(inputPath, 'utf8')
const laws = JSON.parse(raw)

// Helper: Normalize law name (remove date, extra spaces, etc.)
function normalizeLawName(title) {
  // Remove date at the start (DD/MM/YYYY)
  let t = title.replace(/^\d{2}\/\d{2}\/\d{4}\s*/, '')
  // Remove "Закон за изменение и допълнение на ", "Закон за изменение на ", "Закон за допълнение на "
  t = t.replace(
    /^Закон за (?:изменение и допълнение|изменение|допълнение) на /,
    ''
  )
  // Remove trailing punctuation and spaces
  t = t.replace(/[.,\s]+$/, '')
  // Remove quotes
  t = t.replace(/"/g, '')
  return t.trim()
}

// Helper: Is this an amendment?
function isAmendment(title) {
  return /^\d{2}\/\d{2}\/\d{4}\s*Закон за (?:изменение и допълнение|изменение|допълнение) на /.test(
    title
  )
}

// First, collect all main laws and their normalized names
const mainLawMap = {} // normalizedName -> { main, amendments }
laws.forEach((law) => {
  if (!isAmendment(law.title)) {
    const norm = normalizeLawName(law.title)
    if (!mainLawMap[norm]) mainLawMap[norm] = { main: law, amendments: [] }
    else if (!mainLawMap[norm].main) mainLawMap[norm].main = law
  }
})

// Helper: find best matching main law for an amendment
function findBestMainLaw(normAmendment, mainLawNames) {
  // Exact match
  if (mainLawNames.includes(normAmendment)) return normAmendment
  // Partial match: find main law name that is substring of amendment or vice versa
  for (const name of mainLawNames) {
    if (
      normAmendment.includes(name) ||
      name.includes(normAmendment) ||
      normAmendment.replace(/\s+/g, '').includes(name.replace(/\s+/g, '')) ||
      name.replace(/\s+/g, '').includes(normAmendment.replace(/\s+/g, ''))
    ) {
      return name
    }
  }
  // Fallback: first word match
  const amendFirst = normAmendment.split(' ')[0]
  for (const name of mainLawNames) {
    if (name.split(' ')[0] === amendFirst) return name
  }
  return null
}

// Now, assign amendments to best matching main law
laws.forEach((law) => {
  if (isAmendment(law.title)) {
    const normAmend = normalizeLawName(law.title)
    const mainLawNames = Object.keys(mainLawMap)
    const best = findBestMainLaw(normAmend, mainLawNames)
    if (best) {
      mainLawMap[best].amendments.push(law)
    } else {
      // If no match, create a new group for this amendment
      if (!mainLawMap[normAmend])
        mainLawMap[normAmend] = { main: null, amendments: [law] }
      else mainLawMap[normAmend].amendments.push(law)
    }
  }
})

// Convert to array for easier frontend use
const result = Object.values(mainLawMap).filter((g) => g.main)
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8')

console.log(`Grouped laws written to ${outputPath}`)
