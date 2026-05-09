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

const plannerViews = [
  { id: 'all', label: 'All days' },
  { id: 'planned', label: 'Planned only' },
]

const validateMealForm = (formValues) => {
  const mealName = formValues.name.trim()
  const rawIngredients = formValues.ingredients
    .split(',')
    .map((ingredient) => ingredient.trim())
    .filter(Boolean)
  const errors = {}

  if (!mealName) {
    errors.name = 'Enter a meal name before saving.'
  } else if (mealName.length < 2) {
    errors.name = 'Meal name should have at least 2 characters.'
  } else if (mealName.length > 60) {
    errors.name = 'Meal name should be 60 characters or less.'
  }

  if (!days.includes(formValues.day)) {
    errors.day = 'Choose a valid day.'
  }

  if (!mealCategories.includes(formValues.category)) {
    errors.category = 'Choose a valid category.'
  }

  if (rawIngredients.length === 0) {
    errors.ingredients = 'Add at least one ingredient, separated with commas.'
  } else if (rawIngredients.length > 12) {
    errors.ingredients = 'Keep the list to 12 ingredients or fewer.'
  } else if (rawIngredients.some((ingredient) => ingredient.length > 40)) {
    errors.ingredients = 'Each ingredient should be 40 characters or less.'
  }

  return {
    errors,
    ingredients: rawIngredients,
    mealName,
  }
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
  const [plannerView, setPlannerView] = useState('all')
  const [form, setForm] = useState(initialForm)
  const [formErrors, setFormErrors] = useState({})

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

  const plannedDays = useMemo(
    () => days.filter((day) => mealsByDay[day].length > 0),
    [mealsByDay],
  )

  const visibleDays = plannerView === 'planned' && plannedDays.length > 0
    ? plannedDays
    : days

  const busiestDay = useMemo(() => {
    return days.reduce(
      (currentBusiestDay, day) => {
        const mealCount = mealsByDay[day].length

        if (mealCount > currentBusiestDay.mealCount) {
          return { day, mealCount }
        }

        return currentBusiestDay
      },
      { day: 'No plans yet', mealCount: 0 },
    )
  }, [mealsByDay])

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

  const activeSelectedDay =
    plannerView === 'planned' &&
    plannedDays.length > 0 &&
    !plannedDays.includes(selectedDay)
      ? plannedDays[0]
      : selectedDay

  const mealsForSelectedDay = mealsByDay[activeSelectedDay]
  const selectedDayCategories = [
    ...new Set(mealsForSelectedDay.map((meal) => meal.category)),
  ]
  const todaysDay = days[(new Date().getDay() + 6) % 7]
  const toDayView = mealsByDay[todaysDay] ?? []
  

  const handleInputChange = (event) => {
    const { name, value } = event.target
    const nextForm = {
      ...form,
      [name]: value,
    }

    setForm(nextForm)

    if (formErrors[name]) {
      setFormErrors(validateMealForm(nextForm).errors)
    }
  }

  const resetForm = () => {
    setForm(initialForm)
    setFormErrors({})
    setEditingMealId(null)
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const { errors, ingredients, mealName } = validateMealForm(form)

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
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
    setFormErrors({})
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

  const handleFocusNextPlannedDay = () => {
    if (plannedDays.length === 0) {
      return
    }

    const selectedDayIndex = plannedDays.indexOf(activeSelectedDay)
    const nextDay =
      selectedDayIndex >= 0 && selectedDayIndex < plannedDays.length - 1
        ? plannedDays[selectedDayIndex + 1]
        : plannedDays[0]

    setSelectedDay(nextDay)
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

            <div className="planner-toolbar">
              <div className="view-switch" role="tablist" aria-label="Planner view">
                {plannerViews.map((view) => (
                  <button
                    key={view.id}
                    type="button"
                    className={
                      plannerView === view.id ? 'view-switch-button active' : 'view-switch-button'
                    }
                    onClick={() => setPlannerView(view.id)}
                  >
                    {view.label}
                  </button>
                ))}
              </div>

              <div className="day-tabs" role="tablist" aria-label="Week days">
                {days.map((day) => (
                  <button
                    key={day}
                    type="button"
                    className={day === activeSelectedDay ? 'day-tab active' : 'day-tab'}
                    onClick={() => setSelectedDay(day)}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="planner-focus-panel">
            <div className="planner-focus-main">
              <p className="section-label">Focused day</p>
              <h3>{activeSelectedDay}</h3>
              <p className="planner-focus-copy">
                {mealsForSelectedDay.length > 0
                  ? `${mealsForSelectedDay.length} meals planned across ${selectedDayCategories.length} categories.`
                  : 'This day is still open, so you can schedule something quickly.'}
              </p>

              <div className="planner-highlight-list">
                {mealsForSelectedDay.length > 0 ? (
                  mealsForSelectedDay.map((meal) => (
                    <span key={meal.id} className="planner-highlight-pill">
                      {meal.category}: {meal.name}
                    </span>
                  ))
                ) : (
                  <span className="planner-highlight-pill empty">
                    No meals planned yet
                  </span>
                )}
              </div>
            </div>

            <div className="planner-focus-side">
              <article className="planner-mini-stat">
                <span>Visible days</span>
                <strong>{visibleDays.length}</strong>
              </article>
              <article className="planner-mini-stat">
                <span>Busiest day</span>
                <strong>{busiestDay.day}</strong>
                <small>{busiestDay.mealCount} planned meals</small>
              </article>
              <button
                type="button"
                className="secondary-button planner-action"
                onClick={handleFocusNextPlannedDay}
              >
                Jump to next planned day
              </button>
            </div>
          </div>

          <div className="planner-grid">
            {visibleDays.map((day) => (
              <article
                key={day}
                className={day === activeSelectedDay ? 'day-column focused' : 'day-column'}
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
                  maxLength="60"
                  aria-invalid={Boolean(formErrors.name)}
                  aria-describedby={formErrors.name ? 'meal-name-error' : undefined}
                />
                {formErrors.name && (
                  <span className="field-error" id="meal-name-error" role="alert">
                    {formErrors.name}
                  </span>
                )}
              </label>

              <div className="form-row">
                <label>
                  Day
                  <select
                    name="day"
                    value={form.day}
                    onChange={handleInputChange}
                    aria-invalid={Boolean(formErrors.day)}
                    aria-describedby={formErrors.day ? 'meal-day-error' : undefined}
                  >
                    {days.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                  {formErrors.day && (
                    <span className="field-error" id="meal-day-error" role="alert">
                      {formErrors.day}
                    </span>
                  )}
                </label>

                <label>
                  Category
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleInputChange}
                    aria-invalid={Boolean(formErrors.category)}
                    aria-describedby={
                      formErrors.category ? 'meal-category-error' : undefined
                    }
                  >
                    {mealCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  {formErrors.category && (
                    <span
                      className="field-error"
                      id="meal-category-error"
                      role="alert"
                    >
                      {formErrors.category}
                    </span>
                  )}
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
                  maxLength="240"
                  aria-invalid={Boolean(formErrors.ingredients)}
                  aria-describedby={
                    formErrors.ingredients ? 'meal-ingredients-error' : undefined
                  }
                />
                {formErrors.ingredients && (
                  <span
                    className="field-error"
                    id="meal-ingredients-error"
                    role="alert"
                  >
                    {formErrors.ingredients}
                  </span>
                )}
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
                <h2>{todaysDay} meals</h2>
              </div>
            </div>

            <div className="selected-day-list">
              {toDayView.length > 0 ? (
                toDayView.map((meal) => (
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
