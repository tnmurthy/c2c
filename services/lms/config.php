<?php
unset($CFG);
global $CFG;
$CFG = new stdClass();

$CFG->dbtype    = 'pgsql';
$CFG->dblibrary = 'native';
$CFG->dbhost    = 'moodle-db';
$CFG->dbname    = 'moodle_c2c';
$CFG->dbuser    = 'moodle_user';
$CFG->dbpass    = 'moodle_secure_password';
$CFG->prefix    = 'mdl_';
$CFG->dboptions = array (
  'dbpersist' => 0,
  'dbport' => 5432,
  'dbsocket' => '',
);

// Dynamic wwwroot based on client host header so localhost:3030/lms and c2c.mytestbed.tech/lms both work
$http_host = !empty($_SERVER['HTTP_X_FORWARDED_HOST']) ? $_SERVER['HTTP_X_FORWARDED_HOST'] : (!empty($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost:3030');
if (strpos($http_host, ',') !== false) {
    $parts = explode(',', $http_host);
    $http_host = trim($parts[0]);
}
$is_ssl = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
$proto = $is_ssl ? 'https://' : 'http://';

// Clean encoded query strings from Next.js / Cloudflare proxy rewrites
if (!empty($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '%2F') !== false) {
    $_SERVER['REQUEST_URI'] = urldecode(rtrim($_SERVER['REQUEST_URI'], '='));
}
if (!empty($_SERVER['QUERY_STRING']) && strpos($_SERVER['QUERY_STRING'], '%2F') !== false) {
    $_SERVER['QUERY_STRING'] = urldecode(rtrim($_SERVER['QUERY_STRING'], '='));
}

$CFG->wwwroot   = $proto . $http_host . '/lms';
$CFG->dataroot  = '/var/www/moodledata/';
$CFG->admin     = 'admin';

$CFG->directorypermissions = 02777;
$CFG->dbport = '5432';
$CFG->reverseproxy = true;
$CFG->sslproxy = $is_ssl;
$CFG->preventexecpath = true;
$CFG->routerconfigured = true;
$CFG->enableanalytics = false;
$CFG->yuicomboloading = false;
require_once(__DIR__ . '/lib/setup.php');
