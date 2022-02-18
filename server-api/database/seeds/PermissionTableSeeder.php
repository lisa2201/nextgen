<?php

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Kinderm8\Permission;

class PermissionTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        if(config('database.default') === 'mysql')
        {
            DB::statement('SET FOREIGN_KEY_CHECKS = 0;');
        }
        else
        {
            DB::statement('SET CONSTRAINTS ALL DEFERRED;');
        }

        DB::table('km8_permissions')->truncate();
        DB::table('permission_migration')->truncate();

        $insertPath = [];
        $permission = [];
        $dateTime = Carbon::now();

        foreach (File::allFiles(resource_path('permission-data')) as $file)
        {
            $filename = pathinfo($file->getBasename(), PATHINFO_FILENAME);

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
                $content = include($item['path']);

                if (count($content) > 1)
                {
                    $nav_ref = $content[0]['navigation_ref_id'];

                    array_walk($content, function(&$item) use ($nav_ref)
                    {
                        $item['navigation_ref_id'] = $nav_ref;
                    });

                    unset($nav_ref);
                }

                $permission = array_merge($permission, $content);

                unset($insertPath[$key]['path']);
                unset($content);
            }
            
            foreach ($permission as $key => $value) Permission::create($value);

            DB::table('permission_migration')->insert($insertPath);
        }

        if(config('database.default') === 'mysql')
        {
            DB::statement('SET FOREIGN_KEY_CHECKS = 1;');
        }
        else
        {
            DB::statement('SET CONSTRAINTS ALL IMMEDIATE;');
        }
    }
}
