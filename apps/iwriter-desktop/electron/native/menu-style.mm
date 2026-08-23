#include <node_api.h>
#include <string>
#import <AppKit/AppKit.h>

static NSMenuItem *FindMenuItem(NSMenu *menu, NSString *title) {
  if (!menu || !title) return nil;
  for (NSMenuItem *item in menu.itemArray) {
    if ([item.title isEqualToString:title]) return item;
    NSMenuItem *nested = FindMenuItem(item.submenu, title);
    if (nested) return nested;
  }
  return nil;
}

static NSString *ReadString(napi_env env, napi_value value) {
  size_t length = 0;
  if (napi_get_value_string_utf8(env, value, nullptr, 0, &length) != napi_ok) return nil;
  std::string buffer(length + 1, '\0');
  if (napi_get_value_string_utf8(env, value, buffer.data(), buffer.size(), &length) != napi_ok) return nil;
  return [NSString stringWithUTF8String:buffer.c_str()];
}

static NSColor *ColorFromHex(NSString *hex) {
  NSString *clean = [hex stringByReplacingOccurrencesOfString:@"#" withString:@""];
  if (clean.length != 6) return nil;
  unsigned int value = 0;
  if (![[NSScanner scannerWithString:clean] scanHexInt:&value]) return nil;
  return [NSColor colorWithSRGBRed:((value >> 16) & 0xFF) / 255.0
                             green:((value >> 8) & 0xFF) / 255.0
                              blue:(value & 0xFF) / 255.0
                             alpha:1.0];
}

static napi_value SetMenuItemColor(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value args[2];
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

  bool applied = false;
  if (argc == 2) {
    @autoreleasepool {
      NSString *title = ReadString(env, args[0]);
      NSColor *color = ColorFromHex(ReadString(env, args[1]));
      NSMenuItem *item = FindMenuItem(NSApp.mainMenu, title);
      if (item && color) {
        NSMutableAttributedString *styled = [[NSMutableAttributedString alloc] initWithString:item.title];
        [styled addAttribute:NSForegroundColorAttributeName value:color range:NSMakeRange(0, styled.length)];
        item.attributedTitle = styled;
        applied = true;
      }
    }
  }

  napi_value result;
  napi_get_boolean(env, applied, &result);
  return result;
}

static napi_value SetMenuItemSvgIcon(napi_env env, napi_callback_info info) {
  size_t argc = 3;
  napi_value args[3];
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

  bool applied = false;
  if (argc >= 2) {
    @autoreleasepool {
      NSString *title = ReadString(env, args[0]);
      NSString *svg = ReadString(env, args[1]);
      bool isTemplate = true;
      if (argc >= 3) napi_get_value_bool(env, args[2], &isTemplate);
      NSMenuItem *item = FindMenuItem(NSApp.mainMenu, title);
      NSData *data = [svg dataUsingEncoding:NSUTF8StringEncoding];
      NSImage *image = data ? [[NSImage alloc] initWithData:data] : nil;
      if (item && image) {
        image.size = NSMakeSize(16, 16);
        [image setTemplate:isTemplate];
        item.image = image;
        applied = true;
      }
    }
  }

  napi_value result;
  napi_get_boolean(env, applied, &result);
  return result;
}

static napi_value SetMenuItemPngIcon(napi_env env, napi_callback_info info) {
  size_t argc = 3;
  napi_value args[3];
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

  bool applied = false;
  if (argc >= 2) {
    @autoreleasepool {
      NSString *title = ReadString(env, args[0]);
      void *bytes = nullptr;
      size_t length = 0;
      bool isTemplate = true;
      if (argc >= 3) napi_get_value_bool(env, args[2], &isTemplate);
      if (napi_get_buffer_info(env, args[1], &bytes, &length) == napi_ok && bytes && length > 0) {
        NSData *data = [NSData dataWithBytes:bytes length:length];
        NSImage *image = [[NSImage alloc] initWithData:data];
        NSMenuItem *item = FindMenuItem(NSApp.mainMenu, title);
        if (item && image && image.representations.count > 0) {
          image.size = NSMakeSize(16, 16);
          [image setTemplate:isTemplate];
          item.image = image;
          applied = true;
        }
      }
    }
  }

  napi_value result;
  napi_get_boolean(env, applied, &result);
  return result;
}

static napi_value HasMenuItemIcon(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  bool present = false;
  if (argc == 1) {
    @autoreleasepool {
      NSMenuItem *item = FindMenuItem(NSApp.mainMenu, ReadString(env, args[0]));
      present = item && item.image && item.image.representations.count > 0;
    }
  }
  napi_value result;
  napi_get_boolean(env, present, &result);
  return result;
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_value method;
  napi_create_function(env, "setMenuItemColor", NAPI_AUTO_LENGTH, SetMenuItemColor, nullptr, &method);
  napi_set_named_property(env, exports, "setMenuItemColor", method);
  napi_create_function(env, "setMenuItemSvgIcon", NAPI_AUTO_LENGTH, SetMenuItemSvgIcon, nullptr, &method);
  napi_set_named_property(env, exports, "setMenuItemSvgIcon", method);
  napi_create_function(env, "setMenuItemPngIcon", NAPI_AUTO_LENGTH, SetMenuItemPngIcon, nullptr, &method);
  napi_set_named_property(env, exports, "setMenuItemPngIcon", method);
  napi_create_function(env, "hasMenuItemIcon", NAPI_AUTO_LENGTH, HasMenuItemIcon, nullptr, &method);
  napi_set_named_property(env, exports, "hasMenuItemIcon", method);
  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
