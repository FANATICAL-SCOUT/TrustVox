function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`
}

function formatDelta(value) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
}

export default function AnalyticsPDFTemplate({
  report,
  campaignLabel,
  lineChartData,
  barChartData,
  responseDistributionData,
  sentimentTrendData,
  responseVsSentimentData,
}) {
  const generatedOn = new Date(report.generatedAt).toLocaleString("en-US")
  const trendKeys = lineChartData.length > 0 ? Object.keys(lineChartData[0]).filter((key) => key !== "date" && key !== "label") : []
  const trendColors = ["#2563eb", "#7c3aed", "#059669", "#dc2626", "#0ea5e9"]
  const trendMax = Math.max(1, ...lineChartData.flatMap((row) => trendKeys.map((key) => Number(row[key] || 0))))
  const sentimentMax = Math.max(1, ...barChartData.flatMap((item) => [item.positive, item.negative]))

  return (
    <div id="analytics-pdf-template" className="pdf-report-root" aria-hidden="true">
      <style>{`
        .pdf-report-root {
          width: 794px;
          background: #ffffff;
          color: #111827;
          font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
          line-height: 1.45;
        }
        .pdf-page {
          width: 100%;
          min-height: 1122px;
          padding: 42px 48px;
          box-sizing: border-box;
          background: #ffffff;
        }
        .page-break {
          break-before: page;
          page-break-before: always;
        }
        .report-title {
          font-size: 30px;
          font-weight: 700;
          margin: 0;
          color: #111827;
        }
        .meta-line {
          margin-top: 6px;
          color: #374151;
          font-size: 13px;
        }
        .section {
          margin-top: 22px;
        }
        .section-title {
          margin: 0 0 10px;
          font-size: 18px;
          font-weight: 700;
          color: #111827;
        }
        .body-text {
          margin: 0;
          font-size: 13px;
          color: #1f2937;
        }
        .summary-list {
          margin: 0;
          padding-left: 18px;
        }
        .summary-list li {
          margin: 4px 0;
          font-size: 13px;
          color: #1f2937;
        }
        .table-wrap {
          border: 1px solid #d1d5db;
          border-radius: 0;
          overflow: hidden;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        th, td {
          border: 1px solid #d1d5db;
          padding: 8px 10px;
          text-align: left;
          vertical-align: top;
        }
        th {
          background: #f3f4f6;
          color: #111827;
          font-weight: 700;
        }
        td {
          color: #1f2937;
          background: #ffffff;
        }
        .chart-box {
          border: 1px solid #d1d5db;
          padding: 12px;
          margin-top: 10px;
        }
        .legend {
          margin-top: 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 11px;
          color: #374151;
        }
        .legend-dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 5px;
          vertical-align: middle;
        }
        .sentiment-row {
          margin: 10px 0;
        }
        .sentiment-label {
          margin-bottom: 4px;
          font-size: 12px;
          color: #111827;
          font-weight: 600;
        }
        .bar-track {
          display: flex;
          height: 12px;
          border: 1px solid #d1d5db;
          background: #f9fafb;
          overflow: hidden;
        }
        .bar-positive {
          background: #16a34a;
        }
        .bar-negative {
          background: #dc2626;
        }
        .analysis-block {
          border: 1px solid #d1d5db;
          background: #ffffff;
          padding: 10px 12px;
          margin-bottom: 8px;
          font-size: 13px;
          color: #1f2937;
        }
        .bullet-list {
          margin: 0;
          padding-left: 18px;
        }
        .bullet-list li {
          margin: 5px 0;
          font-size: 13px;
          color: #1f2937;
        }
        .recommendation {
          border: 1px solid #9ca3af;
          padding: 12px;
          font-size: 13px;
          color: #111827;
          background: #f9fafb;
        }
        .trend-series {
          margin-bottom: 12px;
        }
        .trend-series-title {
          margin-bottom: 5px;
          font-size: 12px;
          color: #111827;
          font-weight: 600;
        }
        .trend-bars {
          display: flex;
          gap: 4px;
          align-items: flex-end;
          height: 64px;
          border: 1px solid #d1d5db;
          padding: 6px;
          background: #f9fafb;
        }
        .trend-bar {
          width: 16px;
          min-height: 2px;
        }
        .trend-labels {
          display: flex;
          gap: 4px;
          margin-top: 4px;
          color: #6b7280;
          font-size: 10px;
        }
        .trend-labels span {
          width: 16px;
          text-align: center;
        }
        .distribution-item {
          margin: 8px 0;
        }
        .distribution-track {
          height: 10px;
          border: 1px solid #d1d5db;
          background: #f9fafb;
          overflow: hidden;
        }
        .distribution-fill {
          height: 100%;
          background: #2563eb;
        }
        .scatter-grid {
          border: 1px solid #d1d5db;
          background: #f9fafb;
          padding: 12px;
        }
        .scatter-point {
          margin: 6px 0;
          font-size: 12px;
          color: #1f2937;
        }
      `}</style>

      <div className="pdf-page">
        <section>
          <h1 className="report-title">Campaign Analytics Report</h1>
          <p className="meta-line">Generated: {generatedOn}</p>
          <p className="meta-line">Campaigns Compared: {campaignLabel}</p>
        </section>

        <section className="section">
          <h2 className="section-title">Executive Summary</h2>
          <ul className="summary-list">
            {report.summaryLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section className="section">
          <h2 className="section-title">KPI Table</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Campaign Name</th>
                  <th>Total Responses</th>
                  <th>Engagement Rate</th>
                  <th>Positive %</th>
                  <th>Negative %</th>
                  <th>Sentiment Score</th>
                  <th>Rank</th>
                </tr>
              </thead>
              <tbody>
                {report.metrics.map((metric) => (
                  <tr key={`kpi-${metric.campaignId}`}>
                    <td>{metric.campaignName}</td>
                    <td>{metric.totalResponses}</td>
                    <td>{metric.engagementRate.toFixed(2)} / day</td>
                    <td>{formatPercent(metric.positiveRate)}</td>
                    <td>{formatPercent(metric.negativeRate)}</td>
                    <td>{metric.sentimentScore.toFixed(1)}</td>
                    <td>#{metric.rank}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Trend Visualization</h2>
          <div className="chart-box">
            {trendKeys.map((key, index) => (
              <div className="trend-series" key={`trend-${key}`}>
                <div className="trend-series-title">{key}</div>
                <div className="trend-bars">
                  {lineChartData.map((row, rowIndex) => {
                    const value = Number(row[key] || 0)
                    const height = Math.max(2, Math.round((value / trendMax) * 48))
                    return (
                      <div
                        key={`trend-bar-${key}-${rowIndex}`}
                        className="trend-bar"
                        style={{
                          height: `${height}px`,
                          background: trendColors[index % trendColors.length],
                        }}
                      />
                    )
                  })}
                </div>
                <div className="trend-labels">
                  {lineChartData.map((row, rowIndex) => (
                    <span key={`trend-label-${key}-${rowIndex}`}>{row.label}</span>
                  ))}
                </div>
              </div>
            ))}

            <div className="legend">
              {trendKeys.map((key, index) => (
                <span key={`legend-${key}`}>
                  <span className="legend-dot" style={{ background: trendColors[index % trendColors.length] }} />
                  {key}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Sentiment Visualization</h2>
          <div className="chart-box">
            {barChartData.map((row) => (
              <div className="sentiment-row" key={`sentiment-${row.name}`}>
                <div className="sentiment-label">{row.name}</div>
                <div className="bar-track">
                  <div className="bar-positive" style={{ width: `${(row.positive / sentimentMax) * 100}%` }} />
                  <div className="bar-negative" style={{ width: `${(row.negative / sentimentMax) * 100}%` }} />
                </div>
                <div className="meta-line">Positive: {row.positive} | Negative: {row.negative}</div>
              </div>
            ))}

            <div className="legend">
              <span>
                <span className="legend-dot" style={{ background: "#16a34a" }} /> Positive
              </span>
              <span>
                <span className="legend-dot" style={{ background: "#dc2626" }} /> Negative
              </span>
            </div>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Response Distribution (Donut Export View)</h2>
          <div className="chart-box">
            {responseDistributionData.map((entry) => (
              <div className="distribution-item" key={`distribution-${entry.name}`}>
                <div className="sentiment-label">{entry.name} ({entry.value} responses, {entry.sharePct.toFixed(1)}%)</div>
                <div className="distribution-track">
                  <div className="distribution-fill" style={{ width: `${Math.max(0, Math.min(100, entry.sharePct))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Sentiment Trend Over Time (Export View)</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Positive</th>
                  <th>Negative</th>
                  <th>Sentiment Score</th>
                </tr>
              </thead>
              <tbody>
                {sentimentTrendData.map((row) => (
                  <tr key={`sentiment-trend-${row.date}`}>
                    <td>{row.label}</td>
                    <td>{row.positive}</td>
                    <td>{row.negative}</td>
                    <td>{row.sentimentScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Responses vs Sentiment Score (Scatter Export View)</h2>
          <div className="scatter-grid">
            {responseVsSentimentData.map((point) => (
              <div className="scatter-point" key={`scatter-${point.campaignName}`}>
                <strong>{point.campaignName}</strong>: responses {point.responses}, sentiment score {point.sentimentScore}, engagement/day {point.engagementRate}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="pdf-page page-break">
        <section>
          <h2 className="section-title">Advanced Metrics Table</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Engagement Rate</th>
                  <th>Consistency</th>
                  <th>Sentiment Score</th>
                  <th>Peak Contribution</th>
                  <th>Drop-off</th>
                </tr>
              </thead>
              <tbody>
                {report.metrics.map((metric) => (
                  <tr key={`advanced-${metric.campaignId}`}>
                    <td>{metric.campaignName}</td>
                    <td>{metric.engagementRate.toFixed(2)} / day</td>
                    <td>{metric.consistencyLevel} ({metric.consistencyScore.toFixed(2)})</td>
                    <td>{metric.sentimentScore.toFixed(1)}</td>
                    <td>{metric.peakContributionPct.toFixed(1)}%</td>
                    <td>{metric.dropOffPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Comparative Analysis</h2>
          {report.comparativeAnalysis.map((line) => (
            <div key={line} className="analysis-block">{line}</div>
          ))}
        </section>

        <section className="section">
          <h2 className="section-title">Pattern Observations</h2>
          <ul className="bullet-list">
            {report.patternObservations.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section className="section">
          <h2 className="section-title">Comparative Trend Deltas</h2>
          <ul className="bullet-list">
            {report.pairwise.map((comparison) => (
              <li key={`${comparison.previousCampaignId}-${comparison.currentCampaignId}`}>
                {comparison.currentCampaignName} vs {comparison.previousCampaignName}: response change {formatDelta(comparison.responseChangePct)} and negative-rate change {formatDelta(comparison.negativeRateChangePct)}.
              </li>
            ))}
          </ul>
        </section>

        <section className="section">
          <h2 className="section-title">Final Recommendation</h2>
          <p className="recommendation">{report.finalRecommendation}</p>
        </section>

        <section className="section">
          <h2 className="section-title">Final Summarization</h2>
          <ul className="summary-list">
            {report.finalSummary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
