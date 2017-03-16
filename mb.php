<?php
define('DS', DIRECTORY_SEPARATOR);
$www_path = dirname(__FILE__);
$project_path =  $www_path . DS . 'projects';

function error($m = 'error'){
    echo $m;
    exit();
}

header('Cotnent-Type:application/json;charset=UTF-8');

if(isset($_GET['save'])){
    if(!isset($_POST['project']))
        error();
    if(!isset($_POST['projectdata']))
        error();

    $name = $_POST['project'];
    $data = $_POST['projectdata'];

    $dir = $project_path . DS . $name;

    if(!file_exists($dir)){
        if(!mkdir($dir, 0755, true))
            error('mkdir error');
    }

    if(isset($_FILES)){
        foreach($_FILES as $k => $file){
            if($file['error'] == UPLOAD_ERR_OK){
                $df = $dir . DS . $file['name'];
                if(file_exists($df))
                    @unlink($df);
                move_uploaded_file($file['tmp_name'], $df);
            }
        }
    }

    file_put_contents($dir . DS . 'data', $data);

    echo json_encode(array(
        'name' => $name
        ,'data' => json_decode($data)
    ));
}else if(isset($_GET['open'])){
    $data = array();
    foreach(array_reverse(glob($project_path . DS . '*')) as $v){
        if(is_dir($v) && file_exists($v . DS . 'data')){
            $t = filemtime($v . DS . 'data');
            $data[$t] = array(
                'name' => basename($v)
                ,'time' => date('Y-m-d H:i:s', $t)
            );
        }
    }
    krsort($data, SORT_NUMERIC);
    echo json_encode(array_values($data));
}else if(isset($_GET['project'])){
    if(!isset($_GET['name']))
        error('no name');
    if(false !== stripos($_GET['name'], DS))
        error('name error');
    $data = $project_path . DS . $_GET['name'] . DS  . 'data';
    if(!file_exists($data))
        error('file error');

    $obj = json_decode(file_get_contents($data));
    $obj->name = $_GET['name'];
    echo json_encode($obj);
}else if(isset($_GET['remove'])){
    if(!isset($_GET['name']))
        error('no name');
    if(false !== stripos($_GET['name'], DS))
        error('name error');

    $dir = $project_path . DS . $_GET['name'];
    if(!is_dir($dir))
        error('no project');

    exec("rm -rf {$dir}");
    echo json_encode(array('ok'));
}
