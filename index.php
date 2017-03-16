<?php
define('DS', DIRECTORY_SEPARATOR);
$www_path = dirname(__FILE__);
$template_path =  $www_path . DS . 'templates';
$templates = array();
foreach(glob($template_path . DS . '*') as $v){
    if(is_dir($v) && file_exists($v . DS . basename($v) . '.html'))
        $templates[] = basename($v);
}

$data = array();
$data['www'] = $www_path;
foreach($templates as $v){
    $tfile = $template_path . DS . $v . DS . $v . '.html';
    if(file_exists($tfile))
        $data['html'][] = array('name' => $v, 'html' => file_get_contents($tfile));

    $cfile = $template_path . DS . $v . DS . $v . '.js';
    if(file_exists($cfile))
        $data['config'][] = array('name' => $v, 'config' => file_get_contents($cfile));
}
$data['templates'] = json_encode($templates);

require $www_path . DS . 'lib' . DS . 'Mustache' .DS . 'Autoloader.php';
Mustache_Autoloader::register();
$m = new Mustache_Engine(array(
    'loader' => new Mustache_Loader_FilesystemLoader($www_path, array('extension' => '.html'))
));
echo $m->render('mb', $data);
