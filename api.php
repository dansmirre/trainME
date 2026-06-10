<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$dataDir = __DIR__ . '/data';
$dataFile = $dataDir . '/training-log.json';
$lockFile = $dataDir . '/training-log.lock';

if (!is_dir($dataDir) && !mkdir($dataDir, 0755, true)) {
    respond(500, ['error' => 'Cannot create data directory']);
}

if (!isAuthorized()) {
    respond(401, ['error' => 'Unauthorized']);
}

if ($method === 'GET') {
    respond(200, [
        'version' => 1,
        'entries' => readEntries($dataFile),
        'serverTime' => gmdate('c'),
    ]);
}

if ($method !== 'POST') {
    respond(405, ['error' => 'Method not allowed']);
}

$payload = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($payload)) {
    respond(400, ['error' => 'Invalid JSON payload']);
}

$action = $payload['action'] ?? '';
$entry = $payload['entry'] ?? null;
$entries = $payload['entries'] ?? null;

$lockHandle = fopen($lockFile, 'c');
if (!$lockHandle || !flock($lockHandle, LOCK_EX)) {
    respond(500, ['error' => 'Cannot acquire storage lock']);
}

try {
    $current = readEntries($dataFile);

    if ($action === 'replace') {
        if (!is_array($entries)) {
            respond(400, ['error' => 'Missing entries array']);
        }
        $current = sanitizeEntries($entries);
    } elseif ($action === 'upsert') {
        if (!is_array($entry) || empty($entry['id'])) {
            respond(400, ['error' => 'Missing entry id']);
        }
        $entry = sanitizeEntry($entry);
        $found = false;
        foreach ($current as $index => $item) {
            if (($item['id'] ?? '') === $entry['id']) {
                $current[$index] = $entry;
                $found = true;
                break;
            }
        }
        if (!$found) {
            $current[] = $entry;
        }
    } elseif ($action === 'delete') {
        $id = (string)($payload['id'] ?? '');
        if ($id === '') {
            respond(400, ['error' => 'Missing id']);
        }
        $current = array_values(array_filter($current, fn ($item) => ($item['id'] ?? '') !== $id));
    } else {
        respond(400, ['error' => 'Unknown action']);
    }

    writeEntries($dataFile, $current);
    respond(200, [
        'version' => 1,
        'entries' => $current,
        'serverTime' => gmdate('c'),
    ]);
} finally {
    flock($lockHandle, LOCK_UN);
    fclose($lockHandle);
}

function isAuthorized(): bool
{
    $password = $_SERVER['HTTP_X_TRAINING_LOG_PASSWORD'] ?? '';
    return hash_equals(TRAINING_LOG_PASSWORD, $password);
}

function readEntries(string $file): array
{
    if (!is_file($file)) {
        return [];
    }
    $decoded = json_decode(file_get_contents($file) ?: '[]', true);
    return is_array($decoded) ? sanitizeEntries($decoded) : [];
}

function writeEntries(string $file, array $entries): void
{
    $json = json_encode($entries, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false || file_put_contents($file, $json, LOCK_EX) === false) {
        respond(500, ['error' => 'Cannot write data file']);
    }
}

function sanitizeEntries(array $entries): array
{
    return array_values(array_map('sanitizeEntry', $entries));
}

function sanitizeEntry(array $entry): array
{
    $allowed = [
        'id', 'date', 'week', 'cycleWeek', 'session', 'exercise', 'plan',
        'weight', 'reps', 'rpe', 'rir', 'notes', 'createdAt', 'updatedAt',
    ];
    $clean = [];
    foreach ($allowed as $key) {
        $clean[$key] = $entry[$key] ?? '';
    }
    $clean['id'] = (string)$clean['id'];
    $clean['date'] = (string)$clean['date'];
    $clean['week'] = (string)$clean['week'];
    $clean['cycleWeek'] = (int)$clean['cycleWeek'];
    $clean['session'] = (string)$clean['session'];
    $clean['exercise'] = (string)$clean['exercise'];
    $clean['plan'] = (string)$clean['plan'];
    $clean['weight'] = normalizeNumber($clean['weight']);
    $clean['reps'] = normalizeNumber($clean['reps']);
    $clean['rpe'] = normalizeNumber($clean['rpe']);
    $clean['rir'] = normalizeNumber($clean['rir']);
    $clean['notes'] = (string)$clean['notes'];
    $clean['createdAt'] = (int)$clean['createdAt'];
    $clean['updatedAt'] = (int)$clean['updatedAt'];
    return $clean;
}

function normalizeNumber(mixed $value): int|float|string
{
    if ($value === '' || $value === null) {
        return '';
    }
    return is_numeric($value) ? $value + 0 : '';
}

function respond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}
