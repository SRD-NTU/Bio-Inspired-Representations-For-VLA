'use strict';

const budgets = ['1%', '3%', '5%', '10%', '20%'];
const displayTasks = {
  libero: ['Goal', 'Object', 'Spatial', 'Long'],
  simpler: ['Spoon on Towel', 'Carrot on Plate', 'Stack Cube', 'Eggplant in Basket']
};
const taskDisplayNames = {
  'Spoon on Towel': 'Spoon On Towel',
  'Carrot on Plate': 'Carrot On Plate',
  'Eggplant in Basket': 'Eggplant In Basket'
};
const methodOrder = ['Uniform', 'Foveated', 'Sunflower', 'SALISA', 'CORTAct^focus', 'CORTAct^context', 'CORTAct'];
const methodLabels = {
  Uniform: 'Uniform', Foveated: 'Foveated', Sunflower: 'Sunflower', SALISA: 'SALISA',
  'CORTAct^focus': 'HERo-Focused', 'CORTAct^context': 'HERo-Context', CORTAct: 'HERo-Hypothetical'
};
const methodColors = {
  Uniform: '#4d4d4d', Foveated: '#0072b2', Sunflower: '#e69f00', SALISA: '#d55e00',
  'CORTAct^focus': '#cc79a7', 'CORTAct^context': '#56b4e9', CORTAct: '#009e73'
};
function esc(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function methodMarkup(method) {
  if (method === 'CORTAct^focus') return 'HERo<sup><i>f</i></sup>';
  if (method === 'CORTAct^context') return 'HERo<sup><i>c</i></sup>';
  if (method === 'CORTAct') return 'HERo<sup>*</sup>';
  return esc(methodLabels[method] || method);
}

function renderTaskTable(task, rows, hasSteps, isOpen = false) {
  const stepNote = hasSteps ? ' / Average Steps' : '';
  const headings = ['Model', 'Parameters', 'Full Res.', 'Method', ...budgets.map(b => `${b} Budget`)];
  const groups = [];
  for (const row of rows) {
    const previous = groups[groups.length - 1];
    const key = [row.Model, row.Params, row['Full Res']].join('\u0000');
    if (previous && previous.key === key) previous.rows.push(row);
    else groups.push({ key, rows: [row] });
  }
  const body = groups.map(group => group.rows.map((row, index) => {
    const start = index === 0 ? ' model-start' : '';
    const hero = row.Method.startsWith('CORTAct') ? ' hero-method' : '';
    const ours = row.Method.startsWith('CORTAct^') ? ' ours' : '';
    const values = budgets.map(budget => {
      const rate = esc(row[`${budget} Success Rate (%)`]);
      const delta = row[`${budget} Change vs Uniform`];
      const change = delta ? ` <span class="delta ${delta.startsWith('+') ? 'positive' : delta.startsWith('-') ? 'negative' : ''}">(${esc(delta)})</span>` : '';
      const steps = hasSteps && row[`${budget} Avg Steps`] ? ` <span class="steps">/ ${esc(row[`${budget} Avg Steps`])}</span>` : '';
      return `<td>${rate}${change}${steps}</td>`;
    }).join('');
    const merged = index === 0
      ? `<td rowspan="${group.rows.length}">${esc(row.Model)}</td><td rowspan="${group.rows.length}">${esc(row.Params)}</td><td rowspan="${group.rows.length}">${esc(row['Full Res'])}</td>`
      : '';
    return `<tr class="${start}${hero}${ours}">${merged}<th scope="row">${methodMarkup(row.Method)}</th>${values}</tr>`;
  }).join('')).join('');
  const headingsHtml = headings.map((name, i) => `<th scope="col"${i >= 4 ? ' title="Success Rate (%)' + stepNote + '"' : ''}>${esc(name)}</th>`).join('');
  const open = isOpen ? ' open' : '';
  const taskName = taskDisplayNames[task] || task;
  return `<details class="task-card" data-task="${esc(task)}"${open}><summary>${esc(taskName)} <span class="row-count">${rows.length} Comparisons</span></summary><div class="table-scroll" role="region" aria-label="${esc(taskName)} Results Table" tabindex="0"><table><caption>${esc(taskName)} Results: Success Rate${stepNote}</caption><thead><tr>${headingsHtml}</tr></thead><tbody>${body}</tbody></table></div></details>`;
}

function setupTableTools(rows, tasks, targetId, toolsId, hasSteps) {
  const target = document.getElementById(targetId);
  const tools = document.getElementById(toolsId);
  const count = rows.length;
  let expanded = new Set([tasks[0]]);
  tools.innerHTML = `<label class="table-search">Search Results<input type="search" data-table-search placeholder="Task, Model, Method, Value…" autocomplete="off"></label><span class="table-count" aria-live="polite"></span><div class="table-actions"><button type="button" data-expand>Expand Visible</button><button type="button" data-collapse>Collapse All</button><button type="button" data-clear>Clear Search</button></div>`;
  const input = tools.querySelector('[data-table-search]');
  const countLabel = tools.querySelector('.table-count');
  const render = () => {
    const query = input.value.trim().toLocaleLowerCase();
    const filtered = rows.filter(row => {
      const searchable = [...Object.values(row), methodLabels[row.Method] || ''].join(' ').toLocaleLowerCase();
      return searchable.includes(query);
    });
    const visibleTasks = tasks.filter(task => filtered.some(row => row.Task === task));
    target.innerHTML = visibleTasks.length
      ? visibleTasks.map(task => renderTaskTable(task, filtered.filter(row => row.Task === task), hasSteps, expanded.has(task))).join('')
      : '<p class="empty-results">No Rows Match This Search.</p>';
    target.querySelectorAll('.task-card').forEach(card => card.addEventListener('toggle', () => {
      if (card.open) expanded.add(card.dataset.task);
      else expanded.delete(card.dataset.task);
    }));
    countLabel.textContent = `Showing ${filtered.length} Of ${count} Comparisons`;
  };
  input.addEventListener('input', render);
  tools.querySelector('[data-expand]').addEventListener('click', () => {
    expanded = new Set([...target.querySelectorAll('.task-card')].map(card => card.dataset.task));
    render();
  });
  tools.querySelector('[data-collapse]').addEventListener('click', () => { expanded.clear(); render(); });
  tools.querySelector('[data-clear]').addEventListener('click', () => { input.value = ''; expanded = new Set([tasks[0]]); render(); input.focus(); });
  render();
}

function mean(values) {
  const valid = values.filter(Number.isFinite);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function matchedTaskModelPairs(rows) {
  const expected = methodOrder.slice(1);
  const methodsByPair = new Map();
  for (const row of rows) {
    const pair = `${row.Task}\u0000${row.Model}`;
    if (!methodsByPair.has(pair)) methodsByPair.set(pair, new Set());
    methodsByPair.get(pair).add(row.Method);
  }
  return new Set([...methodsByPair].filter(([, methods]) => expected.every(method => methods.has(method))).map(([pair]) => pair));
}

function aggregateSeries(rows, taskFilter, view, selectedMethods, metric) {
  const selectedRows = rows.filter(row => taskFilter === 'all' || row.Task === taskFilter);
  const valueKey = budget => metric === 'steps' ? `${budget} Avg Steps` : `${budget} Success Rate (%)`;
  if (view === 'methods') {
    const pairs = matchedTaskModelPairs(selectedRows);
    const balancedRows = selectedRows.filter(row => pairs.has(`${row.Task}\u0000${row.Model}`));
    return selectedMethods.map(method => ({
      label: methodLabels[method], method, kind: 'method', color: methodColors[method],
      points: budgets.map(budget => mean(balancedRows.filter(row => row.Method === method).map(row => Number(row[valueKey(budget)]))))
    }));
  }
  const models = [...new Set(selectedRows.filter(row => selectedMethods.includes(row.Method)).map(row => row.Model))];
  return selectedMethods.flatMap(method => models.filter(model => selectedRows.some(row => row.Model === model && row.Method === method)).map((model, index) => {
    const modelRows = selectedRows.filter(row => row.Model === model && row.Method === method);
    return {
      label: `${model} · ${methodLabels[method]}`, model, method, kind: 'model',
      color: methodColors[method],
      points: budgets.map(budget => mean(modelRows.map(row => Number(row[valueKey(budget)]))))
    };
  }));
}

function renderBarChart(target, series, metric, taskFilter, view, pairCount, svgId) {
  const width = 980, height = 370, left = 66, right = 955, top = 22, bottom = 285;
  const values = series.flatMap(item => item.points).filter(Number.isFinite);
  const max = metric === 'success' ? 100 : values.length ? Math.max(50, Math.ceil(Math.max(...values) / 50) * 50) : 50;
  const tick = metric === 'success' ? 20 : Math.max(10, max / 5);
  const y = value => bottom - value / max * (bottom - top);
  const groupWidth = (right - left) / budgets.length;
  const barWidth = Math.min(23, groupWidth * 0.76 / Math.max(series.length, 1));
  const gap = Math.min(4, barWidth * 0.18);
  const cluster = series.length * barWidth + Math.max(0, series.length - 1) * gap;
  const grid = [];
  for (let value = 0; value <= max + 0.001; value += tick) {
    grid.push(`<line x1="${left}" y1="${y(value)}" x2="${right}" y2="${y(value)}" class="chart-grid"/><text x="${left - 9}" y="${y(value) + 4}" text-anchor="end" class="chart-axis-label">${Math.round(value)}</text>`);
  }
  const labels = budgets.map((budget, index) => `<text x="${left + groupWidth * (index + .5)}" y="${bottom + 23}" text-anchor="middle" class="chart-axis-label">${budget}</text>`).join('');
  const bars = budgets.map((budget, budgetIndex) => {
    const start = left + groupWidth * (budgetIndex + .5) - cluster / 2;
    return series.map((item, seriesIndex) => {
      const value = item.points[budgetIndex];
      if (!Number.isFinite(value)) return '';
      const barHeight = Math.max(0, bottom - y(value));
      const x = start + seriesIndex * (barWidth + gap);
      const unit = metric === 'success' ? '%' : ' Steps';
      const tip = `${item.label} · ${budget}: ${value.toFixed(1)}${unit}`;
      return `<rect x="${x}" y="${y(value)}" width="${barWidth}" height="${barHeight}" fill="${item.color}" tabindex="0" role="img" aria-label="${esc(tip)}" data-tip="${esc(tip)}"></rect>`;
    }).join('');
  }).join('');
  const legend = series.map(item => {
    const label = item.kind === 'model' ? `${esc(item.model)} · ${esc(methodLabels[item.method])}` : esc(methodLabels[item.method]);
    return `<span class="chart-legend-item"><i style="--series-color:${item.color}"></i>${label}</span>`;
  }).join('');
  const taskName = taskFilter === 'all' ? 'All Tasks' : (taskDisplayNames[taskFilter] || taskFilter);
  const metricTitle = metric === 'success' ? 'Success Rate (%)' : 'Average Steps';
  const pairDescription = view === 'methods' ? `${pairCount} Matched Task–Model Pairs` : `Backbones Averaged Over ${taskName} For Selected Methods`;
  const emptyMessage = series.length ? '' : `<text x="${(left + right) / 2}" y="${(top + bottom) / 2}" text-anchor="middle" class="chart-empty-label">Select At Least One Method To Display Results.</text>`;
  target.innerHTML = `<figure class="analysis-chart"><figcaption><strong>${metricTitle} By Visual Budget</strong><span>${esc(taskName)} · ${pairDescription}</span></figcaption><div class="chart-scroll"><svg viewBox="0 0 ${width} ${height}" role="group" aria-labelledby="${svgId}"><title id="${svgId}">${metricTitle} Grouped Bar Chart For ${esc(taskName)}</title>${grid.join('')}<line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" class="chart-axis"/><text transform="translate(15 ${(top + bottom) / 2}) rotate(-90)" text-anchor="middle" class="chart-axis-label">${metric === 'success' ? '%' : 'Steps'}</text>${labels}${bars}${emptyMessage}</svg></div><div class="chart-tooltip" role="tooltip" hidden></div><div class="chart-legend">${legend}</div></figure>`;
  const svg = target.querySelector('svg');
  const tooltip = target.querySelector('.chart-tooltip');
  const placeTooltip = (event, bar) => {
    tooltip.textContent = bar.dataset.tip;
    tooltip.hidden = false;
    const box = bar.getBoundingClientRect();
    const x = event && Number.isFinite(event.clientX) && event.clientX ? event.clientX : box.left + box.width / 2;
    const y = event && Number.isFinite(event.clientY) && event.clientY ? event.clientY : box.top;
    tooltip.style.left = `${Math.min(x + 12, window.innerWidth - tooltip.offsetWidth - 12)}px`;
    tooltip.style.top = `${Math.max(8, y - tooltip.offsetHeight - 10)}px`;
  };
  svg.querySelectorAll('[data-tip]').forEach(bar => {
    bar.addEventListener('pointerenter', event => placeTooltip(event, bar));
    bar.addEventListener('pointermove', event => placeTooltip(event, bar));
    bar.addEventListener('pointerleave', () => { tooltip.hidden = true; });
    bar.addEventListener('focus', () => placeTooltip(null, bar));
    bar.addEventListener('blur', () => { tooltip.hidden = true; });
  });
}

function renderBackboneChart(target, rows, taskFilter, selectedMethods, metric, budget, svgId) {
  const scopedRows = rows.filter(row => taskFilter === 'all' || row.Task === taskFilter);
  const valueKey = budget => metric === 'steps' ? `${budget} Avg Steps` : `${budget} Success Rate (%)`;
  const models = [...new Set(scopedRows.filter(row => selectedMethods.includes(row.Method)).map(row => row.Model))];
  const series = selectedMethods.map(method => ({
    method,
    label: methodLabels[method],
    color: methodColors[method],
    points: models.map(model => mean(scopedRows.filter(row => row.Model === model && row.Method === method).map(row => Number(row[valueKey(budget)]))))
  }));
  const values = series.flatMap(item => item.points).filter(Number.isFinite);
  const max = metric === 'success' ? 100 : values.length ? Math.max(50, Math.ceil(Math.max(...values) / 50) * 50) : 50;
  const tick = metric === 'success' ? 20 : Math.max(10, max / 5);
  const width = 980, height = 360, left = 66, right = 955, top = 18, bottom = 285;
  const y = value => bottom - value / max * (bottom - top);
  const grid = [];
  for (let value = 0; value <= max + .001; value += tick) {
    grid.push(`<line x1="${left}" y1="${y(value)}" x2="${right}" y2="${y(value)}" class="chart-grid"/><text x="${left - 9}" y="${y(value) + 4}" text-anchor="end" class="chart-axis-label">${Math.round(value)}</text>`);
  }
  const groupWidth = (right - left) / Math.max(models.length, 1);
  const barWidth = Math.min(28, groupWidth * .76 / Math.max(series.length, 1));
  const gap = Math.min(5, barWidth * .18);
  const cluster = series.length * barWidth + Math.max(0, series.length - 1) * gap;
  const bars = models.map((model, modelIndex) => {
    const start = left + groupWidth * (modelIndex + .5) - cluster / 2;
    return series.map((item, seriesIndex) => {
      const value = item.points[modelIndex];
      if (!Number.isFinite(value)) return '';
      const barX = start + seriesIndex * (barWidth + gap);
      const tip = `${item.label} · ${model} · ${budget}: ${value.toFixed(1)}${metric === 'success' ? '%' : ' Steps'}`;
      return `<rect x="${barX}" y="${y(value)}" width="${barWidth}" height="${Math.max(0, bottom - y(value))}" fill="${item.color}" tabindex="0" role="img" aria-label="${esc(tip)}" data-tip="${esc(tip)}"></rect>`;
    }).join('');
  }).join('');
  const modelLabels = models.map((model, index) => {
    const params = scopedRows.find(row => row.Model === model)?.Params;
    const label = params ? `${model} (${params})` : model;
    return `<text x="${left + groupWidth * (index + .5)}" y="${bottom + 23}" text-anchor="middle" class="chart-axis-label">${esc(label)}</text>`;
  }).join('');
  const legend = series.map(item => `<span class="chart-legend-item"><i style="--series-color:${item.color}"></i>${esc(item.label)}</span>`).join('');
  const taskName = taskFilter === 'all' ? 'All Tasks' : (taskDisplayNames[taskFilter] || taskFilter);
  const metricTitle = metric === 'success' ? 'Success Rate (%)' : 'Average Steps';
  const emptyMessage = series.length && models.length ? '' : `<text x="${(left + right) / 2}" y="${(top + bottom) / 2}" text-anchor="middle" class="chart-empty-label">Select At Least One Method To Display Results.</text>`;
  target.innerHTML = `<figure class="analysis-chart"><figcaption><strong>${metricTitle} By Backbone At ${esc(budget)}</strong><span>${esc(taskName)} · ${selectedMethods.length} Methods Selected</span></figcaption><div class="chart-scroll"><svg viewBox="0 0 ${width} ${height}" role="group" aria-labelledby="${svgId}"><title id="${svgId}">${metricTitle} By Backbone At ${esc(budget)}</title>${grid.join('')}<line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" class="chart-axis"/><text transform="translate(15 ${(top + bottom) / 2}) rotate(-90)" text-anchor="middle" class="chart-axis-label">${metric === 'success' ? '%' : 'Steps'}</text>${modelLabels}${bars}${emptyMessage}</svg></div><div class="chart-tooltip" role="tooltip" hidden></div><div class="chart-legend">${legend}</div></figure>`;
  const tooltip = target.querySelector('.chart-tooltip');
  target.querySelectorAll('svg [data-tip]').forEach(bar => {
    const show = event => {
      tooltip.textContent = bar.dataset.tip;
      tooltip.hidden = false;
      const box = bar.getBoundingClientRect();
      const x = event && event.clientX ? event.clientX : box.left + box.width / 2;
      const yPosition = event && event.clientY ? event.clientY : box.top;
      tooltip.style.left = `${Math.min(x + 12, window.innerWidth - tooltip.offsetWidth - 12)}px`;
      tooltip.style.top = `${Math.max(8, yPosition - tooltip.offsetHeight - 10)}px`;
    };
    bar.addEventListener('pointerenter', show);
    bar.addEventListener('pointermove', show);
    bar.addEventListener('pointerleave', () => { tooltip.hidden = true; });
    bar.addEventListener('focus', () => show(null));
    bar.addEventListener('blur', () => { tooltip.hidden = true; });
  });
}

function initializeDatasetChart(rows, tasks, hasSteps, targetId) {
  const target = document.getElementById(targetId);
  const taskOptions = ['<option value="all">All Tasks</option>', ...tasks.map(task => `<option value="${esc(task)}">${esc(taskDisplayNames[task] || task)}</option>`)].join('');
  const metricOptions = `<option value="success">Success Rate (%)</option>${hasSteps ? '<option value="steps">Average Steps</option>' : ''}`;
  const methodOptions = methodOrder.map(method => `<label><input type="checkbox" data-method="${esc(method)}" checked> ${esc(methodLabels[method])}</label>`).join('');
  const measureControl = hasSteps ? `<label>Measure <select data-control="metric">${metricOptions}</select></label>` : '';
  target.innerHTML = `<div class="analysis-controls"><label>Task Filter <select data-control="task">${taskOptions}</select></label>${measureControl}<label>View <select data-control="view"><option value="methods">Compare Methods (Mean Across Backbones)</option><option value="models">Compare Backbones</option></select></label><label data-budget-control hidden>Visual Budget <select data-control="budget">${budgets.map(budget => `<option value="${budget}"${budget === '20%' ? ' selected' : ''}>${budget}</option>`).join('')}</select></label><details class="method-filter"><summary>Methods</summary><div class="method-checks"><label><input type="checkbox" data-method-all checked> All Methods</label>${methodOptions}</div></details><button type="button" data-chart-reset>Reset Chart</button></div><div class="analysis-output" aria-live="polite"></div>`;
  const taskSelect = target.querySelector('[data-control="task"]');
  const metricSelect = target.querySelector('[data-control="metric"]');
  const viewSelect = target.querySelector('[data-control="view"]');
  const budgetSelect = target.querySelector('[data-control="budget"]');
  const budgetControl = target.querySelector('[data-budget-control]');
  const allMethods = target.querySelector('[data-method-all]');
  const methodInputs = [...target.querySelectorAll('[data-method]')];
  const methodSummary = target.querySelector('.method-filter summary');
  const output = target.querySelector('.analysis-output');
  const update = () => {
    const metric = metricSelect ? metricSelect.value : 'success';
    const selectedMethods = methodInputs.filter(input => input.checked).map(input => input.dataset.method);
    allMethods.checked = selectedMethods.length === methodInputs.length;
    allMethods.indeterminate = selectedMethods.length > 0 && selectedMethods.length < methodInputs.length;
    methodSummary.textContent = `Methods (${selectedMethods.length} Selected)`;
    const scopedRows = rows.filter(row => taskSelect.value === 'all' || row.Task === taskSelect.value);
    const pairCount = matchedTaskModelPairs(scopedRows).size;
    budgetControl.hidden = viewSelect.value !== 'models';
    if (viewSelect.value === 'models') {
      renderBackboneChart(output, rows, taskSelect.value, selectedMethods, metric, budgetSelect.value, `${targetId}-svg-title`);
    } else {
      const series = aggregateSeries(rows, taskSelect.value, viewSelect.value, selectedMethods, metric);
      renderBarChart(output, series, metric, taskSelect.value, viewSelect.value, pairCount, `${targetId}-svg-title`);
    }
  };
  allMethods.addEventListener('change', () => {
    methodInputs.forEach(input => { input.checked = allMethods.checked; });
    update();
  });
  methodInputs.forEach(input => input.addEventListener('change', update));
  [taskSelect, metricSelect, viewSelect, budgetSelect].filter(Boolean).forEach(control => control.addEventListener('change', update));
  target.querySelector('[data-chart-reset]').addEventListener('click', () => {
    taskSelect.value = 'all';
    if (metricSelect) metricSelect.value = 'success';
    viewSelect.value = 'methods';
    budgetSelect.value = '20%';
    methodInputs.forEach(input => { input.checked = true; });
    update();
  });
  update();
}

function loadTable(dataId, targetId, tasks, hasSteps, chartTargetId, toolsId) {
  const target = document.getElementById(targetId);
  try {
    const dataTemplate = document.getElementById(dataId);
    const dataTable = dataTemplate?.content.querySelector('table');
    if (!dataTable?.tHead?.rows.length || !dataTable.tBodies.length) throw new Error(`No results table found in ${dataId}`);
    const headers = [...dataTable.tHead.rows[0].cells].map(cell => cell.textContent);
    const rows = [...dataTable.tBodies[0].rows].map(row => {
      const values = [...row.cells].map(cell => cell.textContent);
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    });
    setupTableTools(rows, tasks, targetId, toolsId, hasSteps);
    if (!target.querySelector('.task-card')) throw new Error('No result rows were found.');
    initializeDatasetChart(rows, tasks, hasSteps, chartTargetId);
  } catch (error) {
    target.innerHTML = '<p class="error">Results Could Not Be Loaded.</p>';
    document.getElementById(chartTargetId).innerHTML = '';
    console.error(error);
  }
}

loadTable('libero-data', 'suite-results', displayTasks.libero, true, 'libero-analysis', 'suite-tools');
loadTable('simpler-data', 'task-results', displayTasks.simpler, false, 'simpler-analysis', 'task-tools');
