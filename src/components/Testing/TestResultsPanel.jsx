import React from "react";
import PropTypes from "prop-types";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";

const TestResultIcon = ({ status }) => {
  if (status === "pass" || status === "passed") {
    return <CheckCircle2 className="text-green-500" size={16} />;
  }
  if (status === "fail" || status === "failed") {
    return <XCircle className="text-red-500" size={16} />;
  }
  return null;
};

TestResultIcon.propTypes = {
  status: PropTypes.string,
};

const TestSummary = ({ results }) => {
  const { numPassedTests, numFailedTests, numTotalTests, startTime, endTime } =
    results;
  const duration = endTime && startTime ? (endTime - startTime) / 1000 : 0;

  return (
    <div className="flex items-center space-x-4 p-2 border-b border-editor-border text-sm">
      <div className="flex items-center">
        <CheckCircle2 size={16} className="text-green-500 mr-2" />
        <span>
          <span className="font-bold">{numPassedTests || 0}</span> Passati
        </span>
      </div>
      <div className="flex items-center">
        <XCircle size={16} className="text-red-500 mr-2" />
        <span>
          <span className="font-bold">{numFailedTests || 0}</span> Falliti
        </span>
      </div>
      <div className="flex-grow text-right text-gray-400">
        <span>
          Totale: {numTotalTests || 0} test in {duration.toFixed(2)}s
        </span>
      </div>
    </div>
  );
};

TestSummary.propTypes = {
  results: PropTypes.object.isRequired,
};

const AssertionResult = ({ result }) => (
  <div className="ml-4 py-1">
    <div className="flex items-center">
      <TestResultIcon status={result.status} />
      <span className="ml-2">{result.title}</span>
      {result.duration && (
        <span className="ml-2 text-gray-500 text-xs">
          ({result.duration.toFixed(2)}ms)
        </span>
      )}
    </div>
    {result.status === "fail" && result.failureMessages?.length > 0 && (
      <div className="mt-1 ml-6 p-2 bg-red-900/20 rounded">
        <pre className="text-red-400 text-xs whitespace-pre-wrap font-mono">
          {result.failureMessages.join("\n")}
        </pre>
      </div>
    )}
  </div>
);

AssertionResult.propTypes = {
  result: PropTypes.object.isRequired,
};

const TestSuite = ({ suite }) => (
  <div className="p-2 border-b border-editor-border">
    <div className="flex items-center font-semibold">
      <TestResultIcon status={suite.status} />
      <span className="ml-2">{suite.name.split("/").pop()}</span>
    </div>
    <div className="mt-2">
      {suite.assertionResults.map((assertion) => (
        <AssertionResult key={assertion.fullName} result={assertion} />
      ))}
    </div>
  </div>
);

TestSuite.propTypes = {
  suite: PropTypes.object.isRequired,
};

export function TestResultsPanel({ results, error, isRunning }) {
  if (isRunning) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <Loader2 size={24} className="animate-spin mr-2" />
        <span>Esecuzione test in corso...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-400">
        <div className="flex items-center font-bold mb-2">
          <AlertTriangle size={18} className="mr-2" />
          <span>Errore durante l'esecuzione dei test</span>
        </div>
        <p className="mb-4">{error}</p>
        {results?.rawOutput && (
          <div>
            <h4 className="font-semibold text-gray-300">Output grezzo:</h4>
            <pre className="mt-2 p-2 bg-editor-darker rounded text-xs whitespace-pre-wrap font-mono">
              {results.rawOutput}
            </pre>
          </div>
        )}
      </div>
    );
  }

  if (!results || !results.testResults) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        Nessun risultato da visualizzare. Esegui i test per iniziare.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-editor-bg text-white">
      <TestSummary results={results} />
      <div className="flex-1 overflow-y-auto">
        {results.testResults.map((suite) => (
          <TestSuite key={suite.name} suite={suite} />
        ))}
      </div>
    </div>
  );
}

TestResultsPanel.propTypes = {
  results: PropTypes.object,
  error: PropTypes.string,
  isRunning: PropTypes.bool,
};
