<?php

namespace Kinderm8\Console\Commands;

use Carbon\Carbon;
use DB;
use Exception;
use File;
use Illuminate\Console\Command;
use Kinderm8\Permission;
use Kinderm8\Role;
use Log;

class InsertPermisson extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'c:update-permissions';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'insert permissions to new modules';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return mixed
     */
    public function handle()
    {
        try
        {
            DB::beginTransaction();

            $permissionMigration = DB::table('permission_migration')->get()->pluck('migration')->toArray();

            $insertPath = [];
            $permission = [];
            $dateTime = Carbon::now();

            foreach (File::allFiles(resource_path('permission-data')) as $file)
            {
                $filename = pathinfo($file->getBasename(), PATHINFO_FILENAME);

                if(count($permissionMigration) > 0 && in_array($filename, $permissionMigration)) continue;

                array_push($insertPath, [
                    'migration' => $filename,
                    'path' => $file->getPathname(),
                    'created_at' => $dateTime,
                    'updated_at' => $dateTime,
                ]);
            }

            if(count($insertPath) > 0)
            {
                foreach ($insertPath as $key => $item)
                {
                    $list = include($item['path']);

                    if(count($list) > 0)
                    {
                        if (count($list) > 1)
                        {
                            $nav_ref = $list[0]['navigation_ref_id'];

                            array_walk($list, function(&$item) use ($nav_ref)
                            {
                                $item['navigation_ref_id'] = $nav_ref;
                            });

                            unset($nav_ref);
                        }

                        $permission = array_merge($permission, $list);

                        unset($insertPath[$key]['path']);
                        unset($list);
                    }
                }

                $permissionType = [];
                foreach ($permission as $key => $value)
                {
                    array_push($permissionType, $value['type']);

                    $value['access_level'] = json_encode($value['access_level']);
                    $value['created_at'] = $dateTime;
                    $value['updated_at'] = $dateTime;

                    Permission::insert($value);
                }

                $permissionType = array_unique($permissionType);

                DB::table('permission_migration')->insert($insertPath);

                //add new permission to role ['portal-admin', 'portal-org-admin', 'org-admin']
                $permissionObjs = Permission::whereIn('type', $permissionType)->get();

                $superUser = Role::where('name', 'portal-admin')->get()->first();
                if($superUser != null) $superUser->syncPermissions($permissionObjs);

                $siteManager = Role::where('name', 'portal-org-admin')->get()->first();
                if($siteManager != null) $siteManager->syncPermissions($permissionObjs);

                $orgAdmin = Role::where('name', 'org-admin')->get()->first();
                if($orgAdmin != null) $orgAdmin->syncPermissions($permissionObjs);

                DB::commit();

                //log
                foreach ($permissionType as $name)
                {
                    $this->info('new item added ' . $name);
                }

                unset($permissionType);
                unset($permissionObjs);

                $this->info('done');
            }
            else
            {
                $this->error('no items found');
            }
        }
        catch(Exception $e)
        {

            Log::error($e);

            try
            {
                DB::rollBack();
            }
            catch(Exception $err)
            {
                Log::error($err->getMessage());
            }
        }

        return;
    }
}
