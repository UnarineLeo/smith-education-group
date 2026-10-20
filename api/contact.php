<?php
// Deployed only with the cPanel package; PHP mail uses the host's mail transport.
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function respond(int $status, bool $success): void {
    http_response_code($status);
    echo json_encode(['success' => $success]);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, false);
}
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && !in_array($origin, ['https://smitheducationgroup.co.za', 'https://www.smitheducationgroup.co.za'], true)) respond(403, false);
if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) respond(415, false);
$raw = file_get_contents('php://input', false, null, 0, 20001);
if ($raw === false || strlen($raw) > 20000) respond(413, false);
$data = json_decode($raw, true);
if (!is_array($data)) respond(400, false);
$fields = ['name' => 150, 'email' => 254, 'phone' => 50, 'university' => 200, 'type' => 100, 'message' => 5000];
foreach ($fields as $key => $max) {
    if (!isset($data[$key]) || !is_string($data[$key]) || strlen($data[$key]) > $max * 4) respond(422, false);
    $data[$key] = trim($data[$key]);
}
if (!empty($data['website'])) respond(422, false);
if (($data['consent'] ?? false) !== true || $data['name'] === '' || $data['type'] === '' || $data['message'] === '') respond(422, false);
if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $data['email'])) respond(422, false);
// Lock per client address to prevent concurrent submissions and rapid repeat mail.
$key = hash('sha256', __DIR__ . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
$lock = fopen(sys_get_temp_dir() . '/smith-enquiry-' . $key, 'c+');
if (!$lock || !flock($lock, LOCK_EX)) respond(503, false);
$last = (int) stream_get_contents($lock);
if ($last > time() - 60) respond(429, false);
ftruncate($lock, 0);
rewind($lock);
fwrite($lock, (string) time());
fflush($lock);
$body = "New website enquiry\n\n";
foreach ($fields as $key => $max) $body .= ucfirst($key) . ': ' . $data[$key] . "\n\n";
$body .= "Consent to respond: Yes\n";
$headers = [
    'From: Smith Education Group <info@smitheducationgroup.co.za>',
    'Reply-To: ' . $data['email'],
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit'
];
$sent = mail('info@smitheducationgroup.co.za', 'Website tutoring enquiry', $body, implode("\r\n", $headers));
flock($lock, LOCK_UN);
fclose($lock);
respond($sent ? 200 : 503, $sent);
