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
  ingredientInput: '',
  ingredients: [],
}

const plannerViews = [
  { id: 'all', label: 'All days' },
  { id: 'planned', label: 'Planned only' },
]

const shoppingFilters = [
  { id: 'all', label: 'All' },
  { id: 'unpurchased', label: 'Not bought' },
  { id: 'purchased', label: 'Bought' },
]

const reportDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const getCurrentWeekRange = () => {
  const today = new Date()
  const mondayOffset = (today.getDay() + 6) % 7
  const start = new Date(today)

  start.setDate(today.getDate() - mondayOffset)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  return { start, end }
}

const getReportFileDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const parseReportDate = (value) => {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)

  if (
    !year ||
    !month ||
    !day ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

const validateReportRange = (range) => {
  if (!range.from || !range.to) {
    return { error: 'Choose both the start and end date.' }
  }

  const start = parseReportDate(range.from)
  const end = parseReportDate(range.to)

  if (!start || !end) {
    return { error: 'Choose valid report dates.' }
  }

  if (start > end) {
    return { error: 'The start date cannot be later than the end date.' }
  }

  const dayCount = Math.round((end - start) / 86400000) + 1

  if (dayCount > 366) {
    return { error: 'Choose a date range of up to 366 days.' }
  }

  return { start, end, dayCount, error: '' }
}

const getDatesInRange = (start, end) => {
  const dates = []
  const currentDate = new Date(start)

  while (currentDate <= end) {
    dates.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dates
}

const buildShoppingListFromMeals = (mealsToAggregate) => {
  const itemsByIngredient = new Map()

  mealsToAggregate.forEach((meal) => {
    meal.ingredients.forEach((ingredient) => {
      const normalizedIngredient = ingredient.trim().toLowerCase()

      if (!normalizedIngredient) {
        return
      }

      if (!itemsByIngredient.has(normalizedIngredient)) {
        itemsByIngredient.set(normalizedIngredient, {
          id: normalizedIngredient,
          name: ingredient.trim(),
          plannedMeals: new Set(),
          uses: 0,
        })
      }

      const item = itemsByIngredient.get(normalizedIngredient)

      item.uses += 1
      item.plannedMeals.add(meal.name)
    })
  })

  return [...itemsByIngredient.values()]
    .map((item) => ({
      id: item.id,
      name: item.name,
      uses: item.uses,
      mealCount: item.plannedMeals.size,
      plannedMeals: [...item.plannedMeals],
    }))
    .sort((firstItem, secondItem) =>
      firstItem.name.localeCompare(secondItem.name),
    )
}

const validateMealForm = (formValues) => {
  const mealName = formValues.name.trim()
  const rawIngredients = formValues.ingredients
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
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [shoppingFilter, setShoppingFilter] = useState('all')
  const [form, setForm] = useState(initialForm)
  const [formErrors, setFormErrors] = useState({})
  const [reportStatus, setReportStatus] = useState('')
  const [reportError, setReportError] = useState('')
  const [reportRange, setReportRange] = useState(() => {
    const currentWeek = getCurrentWeekRange()

    return {
      from: getReportFileDate(currentWeek.start),
      to: getReportFileDate(currentWeek.end),
    }
  })

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

  const shoppingList = useMemo(() => buildShoppingListFromMeals(meals), [meals])

  useEffect(() => {
    const validItemIds = new Set(shoppingList.map((item) => item.id))
    // Defer state update to avoid synchronous setState inside effect
    queueMicrotask(() => {
      setPurchasedItems((currentItems) => {
        const prunedItems = Object.fromEntries(
          Object.entries(currentItems).filter(([itemId]) => validItemIds.has(itemId)),
        )

        return Object.keys(prunedItems).length === Object.keys(currentItems).length
          ? currentItems
          : prunedItems
      })
    })
  }, [shoppingList])

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

  const filteredMealsByDay = useMemo(() => {
    if (!selectedCategory) {
      return mealsByDay
    }

    return days.reduce((filtered, day) => {
      filtered[day] = mealsByDay[day].filter(
        (meal) => meal.category === selectedCategory,
      )
      return filtered
    }, {})
  }, [mealsByDay, selectedCategory])

  const filteredShoppingList = useMemo(() => {
    if (shoppingFilter === 'purchased') {
      return shoppingList.filter((item) => purchasedItems[item.id])
    }

    if (shoppingFilter === 'unpurchased') {
      return shoppingList.filter((item) => !purchasedItems[item.id])
    }

    return shoppingList
  }, [purchasedItems, shoppingFilter, shoppingList])

  const activeSelectedDay =
    plannerView === 'planned' &&
    plannedDays.length > 0 &&
    !plannedDays.includes(selectedDay)
      ? plannedDays[0]
      : selectedDay

  const mealsForSelectedDay = filteredMealsByDay[activeSelectedDay]
  const selectedDayCategories = [
    ...new Set(mealsForSelectedDay.map((meal) => meal.category)),
  ]
  const todaysDay = days[(new Date().getDay() + 6) % 7]
  const toDayView = mealsByDay[todaysDay] ?? []
  const reportRangeValidation = useMemo(
    () => validateReportRange(reportRange),
    [reportRange],
  )
  const reportSchedule = useMemo(() => {
    if (reportRangeValidation.error) {
      return []
    }

    return getDatesInRange(
      reportRangeValidation.start,
      reportRangeValidation.end,
    ).map((date) => {
      const day = days[(date.getDay() + 6) % 7]

      return {
        date,
        day,
        meals: mealsByDay[day],
      }
    })
  }, [mealsByDay, reportRangeValidation])
  const reportMeals = useMemo(
    () => reportSchedule.flatMap((entry) => entry.meals),
    [reportSchedule],
  )
  const reportShoppingList = useMemo(
    () => buildShoppingListFromMeals(reportMeals),
    [reportMeals],
  )
  const reportStats = useMemo(() => {
    const completedShoppingItems = reportShoppingList.filter(
      (item) => purchasedItems[item.id],
    ).length

    return {
      totalMeals: reportMeals.length,
      activeDays: reportSchedule.filter((entry) => entry.meals.length > 0)
        .length,
      totalIngredients: reportShoppingList.length,
      completedShoppingItems,
    }
  }, [purchasedItems, reportMeals, reportSchedule, reportShoppingList])
  const reportLabel = reportRangeValidation.error
    ? 'Choose date range'
    : `${reportDateFormatter.format(reportRangeValidation.start)} - ${reportDateFormatter.format(reportRangeValidation.end)}`

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
      ingredientInput: '',
      ingredients: meal.ingredients,
    })
  }

  const handleAddIngredient = () => {
    const nextIngredient = form.ingredientInput.trim()

    if (!nextIngredient) {
      return
    }

    if (nextIngredient.length > 40) {
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        ingredients: 'Each ingredient should be 40 characters or less.',
      }))
      return
    }

    if (form.ingredients.length >= 12) {
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        ingredients: 'Keep the list to 12 ingredients or fewer.',
      }))
      return
    }

    const normalizedIngredient = nextIngredient.toLowerCase()
    const ingredientAlreadyAdded = form.ingredients.some(
      (ingredient) => ingredient.toLowerCase() === normalizedIngredient,
    )

    if (ingredientAlreadyAdded) {
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        ingredients: 'This ingredient is already assigned to the meal.',
      }))
      return
    }

    setForm((currentForm) => ({
      ...currentForm,
      ingredientInput: '',
      ingredients: [...currentForm.ingredients, nextIngredient],
    }))
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      ingredients: '',
    }))
  }

  const handleRemoveIngredient = (ingredientToRemove) => {
    setForm((currentForm) => ({
      ...currentForm,
      ingredients: currentForm.ingredients.filter(
        (ingredient) => ingredient !== ingredientToRemove,
      ),
    }))

    if (formErrors.ingredients) {
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        ingredients: '',
      }))
    }
  }

  const handleIngredientInputKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      handleAddIngredient()
    }
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

  const handleReportRangeChange = (event) => {
    const { name, value } = event.target

    setReportRange((currentRange) => ({
      ...currentRange,
      [name]: value,
    }))
    setReportError('')
    setReportStatus('')
  }

  const handleGenerateWeeklyReport = () => {
    const validation = validateReportRange(reportRange)

    if (validation.error) {
      setReportError(validation.error)
      setReportStatus('')
      return
    }

    const dailyPlan = reportSchedule.flatMap(({ date, day, meals: dayMeals }) => {
      const dateHeading = `${day}, ${reportDateFormatter.format(date)}`

      if (dayMeals.length === 0) {
        return [dateHeading, '  No meals planned.']
      }

      return [
        dateHeading,
        ...dayMeals.map(
          (meal) =>
            `  - ${meal.category}: ${meal.name} (${meal.ingredients.join(', ')})`,
        ),
      ]
    })

    const shoppingItems =
      reportShoppingList.length > 0
        ? reportShoppingList.map(
            (item) =>
              `  [${purchasedItems[item.id] ? 'x' : ' '}] ${item.name} (x${item.uses}, ${item.mealCount} meals) - ${item.plannedMeals.join(', ')}`,
          )
        : ['  No shopping items.']

    const report = [
      'SmartMeal Meal Report',
      `Period: ${reportLabel}`,
      `Generated: ${reportDateFormatter.format(new Date())}`,
      '',
      'SUMMARY',
      `Planned meal entries: ${reportStats.totalMeals}`,
      `Days with meals: ${reportStats.activeDays} of ${validation.dayCount}`,
      `Shopping items: ${reportStats.totalIngredients}`,
      `Bought items: ${reportStats.completedShoppingItems}`,
      '',
      'MEAL PLAN',
      ...dailyPlan,
      '',
      'SHOPPING LIST',
      ...shoppingItems,
      '',
    ].join('\n')

    const reportBlob = new Blob([report], {
      type: 'text/plain;charset=utf-8',
    })
    const reportUrl = URL.createObjectURL(reportBlob)
    const downloadLink = document.createElement('a')

    downloadLink.href = reportUrl
    downloadLink.download = `smartmeal-report-${reportRange.from}-to-${reportRange.to}.txt`
    document.body.appendChild(downloadLink)
    downloadLink.click()
    downloadLink.remove()
    URL.revokeObjectURL(reportUrl)
    setReportError('')
    setReportStatus('Report generated successfully.')
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

              <div className="category-tabs" role="tablist" aria-label="Meal categories">
                <button
                  type="button"
                  className={!selectedCategory ? 'category-tab active' : 'category-tab'}
                  onClick={() => setSelectedCategory(null)}
                >
                  All
                </button>
                {mealCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={
                      selectedCategory === category ? 'category-tab active' : 'category-tab'
                    }
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
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
                    <span>{filteredMealsByDay[day].length} planned</span>
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
                  {filteredMealsByDay[day].length > 0 ? (
                    filteredMealsByDay[day].map((meal) => (
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
                <div className="ingredient-builder">
                  <div className="ingredient-input-row">
                    <input
                      type="text"
                      name="ingredientInput"
                      value={form.ingredientInput}
                      onChange={handleInputChange}
                      onKeyDown={handleIngredientInputKeyDown}
                      placeholder="Add ingredient and press Enter"
                      maxLength="40"
                      aria-invalid={Boolean(formErrors.ingredients)}
                      aria-describedby={
                        formErrors.ingredients ? 'meal-ingredients-error' : undefined
                      }
                    />
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={handleAddIngredient}
                    >
                      Add
                    </button>
                  </div>

                  {form.ingredients.length > 0 ? (
                    <div className="ingredient-chip-list" aria-label="Assigned ingredients">
                      {form.ingredients.map((ingredient) => (
                        <span key={ingredient} className="ingredient-chip">
                          {ingredient}
                          <button
                            type="button"
                            className="ingredient-chip-remove"
                            onClick={() => handleRemoveIngredient(ingredient)}
                            aria-label={`Remove ${ingredient}`}
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="ingredient-hint">
                      Assign at least one ingredient to this meal.
                    </p>
                  )}
                </div>
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
                  <article key={meal.id} className="selected-day-item">
                    <div>
                      <strong>{meal.name}</strong>
                      <span>{meal.category}</span>
                    </div>
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

            <div className="shopping-filter" role="tablist" aria-label="Shopping filter">
              {shoppingFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={
                    shoppingFilter === filter.id
                      ? 'view-switch-button active'
                      : 'view-switch-button'
                  }
                  onClick={() => setShoppingFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="shopping-list">
              {filteredShoppingList.length > 0 ? (
                filteredShoppingList.map((item) => {
                  const isPurchased = Boolean(purchasedItems[item.id])

                  return (
                    <label
                      key={item.id}
                      className={isPurchased ? 'shopping-item purchased' : 'shopping-item'}
                    >
                      <input
                        type="checkbox"
                        checked={isPurchased}
                        onChange={() => handleTogglePurchased(item.id)}
                      />
                      <span>
                        <strong>{item.name}</strong>
                        <small>
                          x{item.uses} in {item.mealCount} meals: {item.plannedMeals.join(', ')}
                        </small>
                      </span>
                      {isPurchased && <em className="shopping-status">Bought</em>}
                    </label>
                  )
                })
              ) : shoppingList.length > 0 ? (
                <p className="empty-state">
                  No items in this filter.
                </p>
              ) : (
                <p className="empty-state">
                  Add meals first to generate the shopping list.
                </p>
              )}
            </div>
          </section>

          <section className="tool-panel">
            <div className="section-heading compact">
              <div>
                <p className="section-label">Weekly report</p>
                <h2>{reportLabel}</h2>
              </div>
            </div>

            <div className="report-date-range">
              <label>
                From
                <input
                  type="date"
                  name="from"
                  value={reportRange.from}
                  max={reportRange.to || undefined}
                  onChange={handleReportRangeChange}
                  aria-invalid={Boolean(reportError)}
                  aria-describedby={reportError ? 'report-range-error' : undefined}
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  name="to"
                  value={reportRange.to}
                  min={reportRange.from || undefined}
                  onChange={handleReportRangeChange}
                  aria-invalid={Boolean(reportError)}
                  aria-describedby={reportError ? 'report-range-error' : undefined}
                />
              </label>
            </div>

            {reportError && (
              <p className="field-error report-error" id="report-range-error" role="alert">
                {reportError}
              </p>
            )}

            <div className="report-summary">
              <div>
                <span>Meal entries</span>
                <strong>{reportStats.totalMeals}</strong>
              </div>
              <div>
                <span>Days with meals</span>
                <strong>{reportStats.activeDays}</strong>
              </div>
              <div>
                <span>Shopping progress</span>
                <strong>
                  {reportStats.completedShoppingItems}/
                  {reportStats.totalIngredients}
                </strong>
              </div>
            </div>

            <button
              type="button"
              className="primary-button report-button"
              onClick={handleGenerateWeeklyReport}
            >
              Generate report
            </button>

            <p className="report-status" role="status" aria-live="polite">
              {reportStatus}
            </p>
          </section>
        </aside>
      </section>
    </main>
  )
}

export default App
