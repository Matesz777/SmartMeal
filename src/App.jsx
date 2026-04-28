import { useEffect, useMemo, useState } from 'react'
import './App.css'

const days = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

const mealCategories = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

const initialMeals = [
  {
    id: crypto.randomUUID(),
    name: 'Greek yogurt bowl',
    day: 'Monday',
    category: 'Breakfast',
    ingredients: ['yogurt', 'banana', 'granola', 'blueberries'],
  },
  {
    id: crypto.randomUUID(),
    name: 'Chicken pasta',
    day: 'Monday',
    category: 'Dinner',
    ingredients: ['pasta', 'chicken breast', 'cream', 'spinach'],
  },
  {
    id: crypto.randomUUID(),
    name: 'Tomato soup',
    day: 'Wednesday',
    category: 'Lunch',
    ingredients: ['tomatoes', 'onion', 'vegetable stock', 'basil'],
  },
]

const initialForm = {
  name: '',
  day: days[0],
  category: mealCategories[0],
  ingredients: '',
}

function App() {
  const [meals, setMeals] = useState(() => {
    const storedMeals = localStorage.getItem('smartmeal-meals')
    return storedMeals ? JSON.parse(storedMeals) : initialMeals
  })
  const [purchasedItems, setPurchasedItems] = useState(() => {
    const storedItems = localStorage.getItem('smartmeal-purchased-items')
    return storedItems ? JSON.parse(storedItems) : {}
  })
  const [editingMealId, setEditingMealId] = useState(null)
  const [selectedDay, setSelectedDay] = useState(days[0])
  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    localStorage.setItem('smartmeal-meals', JSON.stringify(meals))
  }, [meals])

  useEffect(() => {
    localStorage.setItem(
      'smartmeal-purchased-items',
      JSON.stringify(purchasedItems),
    )
  }, [purchasedItems])

  const mealsByDay = useMemo(() => {
    return days.reduce((groupedMeals, day) => {
      groupedMeals[day] = meals
        .filter((meal) => meal.day === day)
        .sort(
          (firstMeal, secondMeal) =>
            mealCategories.indexOf(firstMeal.category) -
            mealCategories.indexOf(secondMeal.category),
        )
      return groupedMeals
    }, {})
  }, [meals])

  const shoppingList = useMemo(() => {
    const uniqueItems = new Map()

    meals.forEach((meal) => {
      meal.ingredients.forEach((ingredient) => {
        const normalizedIngredient = ingredient.trim().toLowerCase()

        if (!normalizedIngredient) {
          return
        }

        if (!uniqueItems.has(normalizedIngredient)) {
          uniqueItems.set(normalizedIngredient, {
            id: normalizedIngredient,
            name: ingredient.trim(),
            plannedMeals: [],
          })
        }

        uniqueItems.get(normalizedIngredient).plannedMeals.push(meal.name)
      })
    })

    return [...uniqueItems.values()].sort((firstItem, secondItem) =>
      firstItem.name.localeCompare(secondItem.name),
    )
  }, [meals])

  const weeklyStats = useMemo(() => {
    const completedShoppingItems = shoppingList.filter(
      (item) => purchasedItems[item.id],
    ).length

    return {
      totalMeals: meals.length,
      activeDays: days.filter((day) => mealsByDay[day].length > 0).length,
      totalIngredients: shoppingList.length,
      completedShoppingItems,
    }
  }, [meals, mealsByDay, purchasedItems, shoppingList])

  const mealsForSelectedDay = mealsByDay[selectedDay]

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  const resetForm = () => {
    setForm(initialForm)
    setEditingMealId(null)
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const mealName = form.name.trim()
    const ingredients = form.ingredients
      .split(',')
      .map((ingredient) => ingredient.trim())
      .filter(Boolean)

    if (!mealName || ingredients.length === 0) {
      return
    }

    const nextMeal = {
      id: editingMealId ?? crypto.randomUUID(),
      name: mealName,
      day: form.day,
      category: form.category,
      ingredients,
    }

    setMeals((currentMeals) => {
      if (editingMealId) {
        return currentMeals.map((meal) =>
          meal.id === editingMealId ? nextMeal : meal,
        )
      }

      return [...currentMeals, nextMeal]
    })

    resetForm()
  }

  const handleEditMeal = (meal) => {
    setEditingMealId(meal.id)
    setSelectedDay(meal.day)
    setForm({
      name: meal.name,
      day: meal.day,
      category: meal.category,
      ingredients: meal.ingredients.join(', '),
    })
  }

  const handleDeleteMeal = (mealId) => {
    setMeals((currentMeals) => currentMeals.filter((meal) => meal.id !== mealId))

    if (editingMealId === mealId) {
      resetForm()
    }
  }

  const handleTogglePurchased = (itemId) => {
    setPurchasedItems((currentItems) => ({
      ...currentItems,
      [itemId]: !currentItems[itemId],
    }))
  }

  return (
    <main className="app-shell">
      <section className="hero-band">
        <div>
          <p className="eyebrow">Meal planning for the week</p>
          <h1>SmartMeal</h1>
          <p className="hero-copy">
            Plan meals, build a shopping list automatically, and keep a clear
            overview of what the group still needs to prepare.
          </p>
        </div>

        <div className="stats-grid" aria-label="Weekly summary">
          <article className="stat-tile">
            <span>Total meals</span>
            <strong>{weeklyStats.totalMeals}</strong>
          </article>
          <article className="stat-tile">
            <span>Active days</span>
            <strong>{weeklyStats.activeDays}</strong>
          </article>
          <article className="stat-tile">
            <span>Shopping items</span>
            <strong>{weeklyStats.totalIngredients}</strong>
          </article>
          <article className="stat-tile">
            <span>Bought already</span>
            <strong>{weeklyStats.completedShoppingItems}</strong>
          </article>
        </div>
      </section>

      <section className="workspace">
        <section className="planner-section">
          <div className="section-heading">
            <div>
              <p className="section-label">Planner</p>
              <h2>Weekly meal overview</h2>
            </div>

            <div className="day-tabs" role="tablist" aria-label="Week days">
              {days.map((day) => (
                <button
                  key={day}
                  type="button"
                  className={day === selectedDay ? 'day-tab active' : 'day-tab'}
                  onClick={() => setSelectedDay(day)}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="planner-grid">
            {days.map((day) => (
              <article
                key={day}
                className={day === selectedDay ? 'day-column focused' : 'day-column'}
              >
                <div className="day-column-header">
                  <div>
                    <h3>{day}</h3>
                    <span>{mealsByDay[day].length} planned</span>
                  </div>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => setSelectedDay(day)}
                  >
                    Open
                  </button>
                </div>

                <div className="meal-list">
                  {mealsByDay[day].length > 0 ? (
                    mealsByDay[day].map((meal) => (
                      <article key={meal.id} className="meal-card">
                        <span className="meal-category">{meal.category}</span>
                        <h4>{meal.name}</h4>
                        <p>{meal.ingredients.join(', ')}</p>
                        <div className="meal-actions">
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => handleEditMeal(meal)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="ghost-button danger"
                            onClick={() => handleDeleteMeal(meal.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="empty-state">No meals planned yet.</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="side-panel">
          <section className="tool-panel">
            <div className="section-heading compact">
              <div>
                <p className="section-label">Task owner</p>
                <h2>{editingMealId ? 'Edit meal' : 'Add a new meal'}</h2>
              </div>
            </div>

            <form className="meal-form" onSubmit={handleSubmit}>
              <label>
                Meal name
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleInputChange}
                  placeholder="Example: Chicken curry"
                />
              </label>

              <div className="form-row">
                <label>
                  Day
                  <select name="day" value={form.day} onChange={handleInputChange}>
                    {days.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Category
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleInputChange}
                  >
                    {mealCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Ingredients
                <textarea
                  name="ingredients"
                  value={form.ingredients}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="tomatoes, pasta, mozzarella"
                />
              </label>

              <div className="form-actions">
                <button type="submit" className="primary-button">
                  {editingMealId ? 'Save changes' : 'Add meal'}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetForm}
                >
                  Clear
                </button>
              </div>
            </form>
          </section>

          <section className="tool-panel">
            <div className="section-heading compact">
              <div>
                <p className="section-label">Today view</p>
                <h2>{selectedDay} meals</h2>
              </div>
            </div>

            <div className="selected-day-list">
              {mealsForSelectedDay.length > 0 ? (
                mealsForSelectedDay.map((meal) => (
                  <div key={meal.id} className="selected-day-item">
                    <strong>{meal.name}</strong>
                    <span>{meal.category}</span>
                  </div>
                ))
              ) : (
                <p className="empty-state">This day is still empty.</p>
              )}
            </div>
          </section>

          <section className="tool-panel">
            <div className="section-heading compact">
              <div>
                <p className="section-label">Shopping list</p>
                <h2>Generated from planned meals</h2>
              </div>
            </div>

            <div className="shopping-list">
              {shoppingList.length > 0 ? (
                shoppingList.map((item) => (
                  <label key={item.id} className="shopping-item">
                    <input
                      type="checkbox"
                      checked={Boolean(purchasedItems[item.id])}
                      onChange={() => handleTogglePurchased(item.id)}
                    />
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.plannedMeals.join(', ')}</small>
                    </span>
                  </label>
                ))
              ) : (
                <p className="empty-state">
                  Add meals first to generate the shopping list.
                </p>
              )}
            </div>
          </section>
        </aside>
      </section>
    </main>
  )
}

export default App
