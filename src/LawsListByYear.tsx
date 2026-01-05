import React, { useEffect, useState } from 'react'

interface Law {
  title: string
  date: string
  link: string
}

interface LawsByYear {
  [year: string]: Law[]
}

const API_LAWS = 'http://localhost:3001/api/laws' // or use /all_laws.json for static

const groupLawsByYear = (laws: Law[]): LawsByYear => {
  const byYear: LawsByYear = {}
  for (const law of laws) {
    // Извличане на годината от датата в title (формат: DD/MM/YYYY ...)
    let year = ''
    const match = law.title.match(/(\d{4})/)
    if (match) year = match[1]
    if (!byYear[year]) byYear[year] = []
    byYear[year].push(law)
  }
  // Сортирай по низходящ ред на годините
  return Object.fromEntries(
    Object.entries(byYear).sort((a, b) => b[0].localeCompare(a[0]))
  )
}

const LawsListByYear: React.FC = () => {
  const [laws, setLaws] = useState<Law[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch('/all_laws.json')
      .then((res) => {
        if (!res.ok) throw new Error('Грешка при зареждане на данните')
        return res.json()
      })
      .then((data) => {
        if (Array.isArray(data)) setLaws(data)
        else setError('Невалиден формат на файла all_laws.json')
        setLoading(false)
      })
      .catch(() => {
        setError('Грешка при зареждане на all_laws.json')
        setLoading(false)
      })
  }, [])

  if (loading) return <div>Зареждане...</div>
  if (error) return <div style={{ color: 'orange' }}>Внимание: {error}</div>
  if (!laws.length) return <div>Няма намерени закони.</div>

  const lawsByYear = groupLawsByYear(laws)

  return (
    <div>
      <h2>Закони по години</h2>
      {Object.entries(lawsByYear).map(([year, yearLaws]) => (
        <div key={year} style={{ marginBottom: 32 }}>
          <h3>{year}</h3>
          <ul>
            {yearLaws.map((law, idx) => (
              <li key={law.link || idx}>
                <a href={law.link} target="_blank" rel="noopener noreferrer">
                  {law.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default LawsListByYear
