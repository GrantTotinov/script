import React, { useEffect, useState } from 'react'

interface Politician {
  id: string
  name: string
  group: string
  region: string
  birthDate: string
  // Add more fields as needed from the API
}
interface Politician {
  A_ns_MP_id: number
  A_ns_MPL_Name1: string
  A_ns_MPL_Name2: string
  A_ns_MPL_Name3: string
  A_ns_MP_PosL_value: string
  A_ns_Va_name: string
}

const API_URL = 'https://www.parliament.bg/api/v1/coll-list-ns/bg'

const PoliticiansList: React.FC = () => {
  const [politicians, setPoliticians] = useState<Politician[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(API_URL)
      .then((res) => {
        if (!res.ok) throw new Error('Грешка при зареждане на данните')
        return res.json()
      })
      .then((data) => {
        if (data && Array.isArray(data.colListMP)) {
          setPoliticians(data.colListMP)
        } else {
          setError('Невалиден формат на отговора от API')
        }
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) return <div>Зареждане...</div>
  if (error) return <div>Грешка: {error}</div>

  return (
    <div>
      <h1>Списък на всички народни представители</h1>
      <table>
        <thead>
          <tr>
            <th>Име</th>
            <th>Длъжност</th>
            <th>Изборен район</th>
          </tr>
        </thead>
        <tbody>
          {politicians.map((p) => (
            <tr key={p.A_ns_MP_id}>
              <td>
                {p.A_ns_MPL_Name1} {p.A_ns_MPL_Name2} {p.A_ns_MPL_Name3}
              </td>
              <td>{p.A_ns_MP_PosL_value}</td>
              <td>{p.A_ns_Va_name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default PoliticiansList
